import React, { Component } from 'react'
import './App.css'
import {
  CartogramSwitcher,
  DroppingPointMarker,
  FeaturePicker,
  FeatureSearchControl,
  FinishingPointMarker,
  LocateMyselfButton,
  LocationMarker,
  NavegadorControl,
  NavigationLinePreviewer,
  Renderer,
  SelectedFeatureControl,
  Snackbar,
  StartingPointMarker
} from '@jcmap-sdk-web/renderer'
import mapData from './cartogram-collection.json'
import { decodeMapData } from './utils'
// import SatelliteLocator from '@jcmap-sdk-web/satellite-locator';
import BeaconLocator from '@jcmap-sdk-web/beacon-locator'
import FusionLocator from '@jcmap-sdk-web/fusion-locator'
import {
  Cartogram,
  CartogramFeature,
  Navegador,
  NavegadorTask,
  NavigationInfo,
  NavigationMode,
  NavigationPosition
} from '@jcmap-sdk-web/navegador'
import BeaconPuller from '@jcmap-sdk-web/beacon-puller'
import {
  parse as urlParse
} from 'url'
import turfCenterOfMass from '@turf/center-of-mass'
import turfLength from '@turf/length'

const cartogramCollection = decodeMapData(mapData)

class App extends Component<any, any> {

  droppingPointMarker = new DroppingPointMarker()
  finishingPoint?: NavigationPosition
  finishingPointMarker = new FinishingPointMarker()
  mapaContainer = React.createRef<HTMLDivElement>()
  navegador: Navegador
  navigationLinePreviewer?: NavigationLinePreviewer
  renderer: Renderer
  selectedFeature?: CartogramFeature
  selectedFeaturePopup = new SelectedFeatureControl()
  startingPoint?: NavigationPosition
  startingPointMarker = new StartingPointMarker()
  navigationMode = NavigationMode.Walking
  currentCartogram?: Cartogram
  locateMyselfButton = new LocateMyselfButton()
  locationMarker = new LocationMarker()
  navigationTask?: NavegadorTask
  latestLocation?: NavigationPosition
  featureSearch = new FeatureSearchControl()
  snackbar = new Snackbar()

  constructor (props: any) {
    super(props)

    const renderer = this.renderer = new Renderer()

    const defaultCartogram = cartogramCollection.floors.filter(f => f.features.length > 0)[0] || cartogramCollection.floors[1]
    renderer
      .setCurrentCartogramSourceData(defaultCartogram)
      .fitCartogram(defaultCartogram)

    // 添加楼层切换组件
    const cartogramSwitcher = new CartogramSwitcher({
      cartograms: cartogramCollection.floors,
      defaultCartogramId: defaultCartogram.id
    })
    cartogramSwitcher
      .on('cartogram', cartogramId => {
        const cartogram = cartogramCollection.floors.find(f => f.id === cartogramId)
        if (cartogram) {
          this.currentCartogram = cartogram
          renderer
            .setCurrentCartogramSourceData(cartogram)
            .fitCartogram(cartogram)
        }
      })
      .attach(renderer)

    // 添加返回当前组件
    const locateMyselfButton = this.locateMyselfButton
    locateMyselfButton
      .on('press', () => {
        const latestLocation = this.latestLocation
        if (latestLocation) {
          const cartogram = cartogramCollection.floors.find(f => f.id === latestLocation.properties.cartogram_id)
          if (cartogram) {
            renderer.setCurrentCartogramSourceData(cartogram)
          }
        }
      })
      .attach(renderer)

    // 当前位置显示组件
    this.locationMarker.attach(renderer)

    // Dropping Marker
    this.droppingPointMarker.attach(renderer)

    // 终点
    this.finishingPointMarker.attach(renderer)

    // 起点
    this.startingPointMarker.attach(renderer)

    // PoI 信息展示
    const selectedFeaturePopup = this.selectedFeaturePopup
    selectedFeaturePopup
      .on('confirm', (selectedFeature) => {
        this.droppingPointMarker.update({ visiable: false })
        this.selectedFeaturePopup.update({ visiable: false })

        const featureCenter = turfCenterOfMass(selectedFeature, selectedFeature.properties) as NavigationPosition

        if (!this.startingPoint && this.latestLocation) {
          this.startingPoint = this.latestLocation
          this.startingPointMarker.update({ visiable: true, position: this.latestLocation })
        }

        if (this.finishingPoint && !this.startingPoint) {
          this.startingPoint = featureCenter
          this.startingPointMarker.update({ visiable: true, position: featureCenter })
        } else {
          this.finishingPoint = featureCenter
          this.finishingPointMarker.update({ visiable: true, position: featureCenter })
        }

        navigationLinePreviewer.update({
          visiable: true,
          startingPoint: this.startingPoint,
          finishingPoint: this.finishingPoint
        })
      })
      .on('cancel', () => {
        this.droppingPointMarker.update({ visiable: false })
      })
      .attach(renderer)

    // 定位器
    const navegador = this.navegador = new Navegador({ floors: cartogramCollection.floors })
    const beaconLocator = new BeaconLocator({ navegador })
    const fusionLocator = new FusionLocator({ beaconLocator })
    fusionLocator.on('location', loc => {
      this.locationMarker
        .update({
          visiable: true,
          position: loc
        })
      this.latestLocation = loc
    })

    // 获取标签扫描信息
    const href = urlParse(window.location.href, true)
    const beaconPuller = new BeaconPuller({
      session: href.query.session as string
    })
    beaconPuller.on('beacon', beaconList => beaconLocator.locate(beaconList))

    // Feature Picker
    const featurePicker = new FeaturePicker({
      queryLayers: ['room-fill-extrusion', 'park-fill-extrusion']
    })
    featurePicker
      .on('feature', (selectedFeature: CartogramFeature) => {
        if (this.navigationTask) {
          return
        }
        this.selectedFeature = selectedFeature
        this.droppingPointMarker.update({
          visiable: true,
          position: turfCenterOfMass(selectedFeature, selectedFeature.properties) as NavigationPosition
        })
        this.selectedFeaturePopup.update({
          visiable: true,
          feature: selectedFeature,
          confirmText: this.finishingPoint && !this.startingPoint ? '设置起点' : '去这里'
        })
      })
      .attach(renderer)

    // Snackbar
    this.snackbar.attach(renderer)

    // 导航模式组件
    const router = new NavegadorControl()
    router
      .on('stop', () => {
        this.featureSearch.update({ visiable: true })
      })
      .attach(renderer)

    // 线路预览
    const navigationLinePreviewer = this.navigationLinePreviewer = new NavigationLinePreviewer({
      navegador: navegador,
      navigationMode: this.navigationMode,
      startingPoint: this.startingPoint,
      finishingPoint: this.finishingPoint
    })
    navigationLinePreviewer
      .on('swap', (evt) => {
        const { newStartingPoint, newFinishingPoint } = evt
        this.startingPoint = newStartingPoint
        this.finishingPoint = newFinishingPoint
        this.startingPointMarker.update({
          visiable: true,
          position: newStartingPoint
        })
        this.finishingPointMarker.update({
          visiable: true,
          position: newFinishingPoint
        })
        navigationLinePreviewer.update({
          visiable: true,
          startingPoint: newStartingPoint,
          finishingPoint: newFinishingPoint
        })
      })
      .on('unavailable', () => {
        this.snackbar.showMessage({
          text: '此地点无法导航'
        })
      })
      .on('cancel', () => {
        this.startingPoint = undefined
        this.finishingPoint = undefined
        this.startingPointMarker.update({ visiable: false })
        this.finishingPointMarker.update({ visiable: false })
        navigationLinePreviewer.update({ visiable: false })
      })
      .on('start', ({ navigationMode, startingPoint, finishingPoint }) => {
        navigationLinePreviewer.update({ visiable: false })
        this.startingPointMarker.update({ visiable: false })
        this.featureSearch.update({ visiable: false })
        if (this.navigationTask) {
          console.error(new Error('已经有导航任务在运行'))
        }
        const navigationTask = this.navigationTask = navegador.startNavigation(navigationMode, startingPoint, finishingPoint)
        router.once('stop', () => {
          navigationTask.stop()
          this.navigationTask = undefined
          router.update({
            visiable: false
          })
          this.finishingPointMarker.update({ visiable: false })
          this.locationMarker.update({
            visiable: true,
            position: this.latestLocation as NavigationPosition
          })
        })
        const handleLocationChange = navigationTask.setCurrentLocation.bind(navigationTask)
        navigationTask
          .on('stop', () => {
            fusionLocator.removeListener('location', handleLocationChange)
            fusionLocator.off('location', handleLocationChange)
          })
          .on('start', () => {
            fusionLocator.on('location', handleLocationChange)
          })
          .on('info', (info: NavigationInfo) => {
            console.log(info)
            const {
              currentLocation,
              navigationPath,
              navigationStatus
            } = info
            this.locationMarker.update({
              visiable: true,
              position: currentLocation
            })

            router.update({
              visiable: true,
              navigationChain: navigationPath,
              navigationStatus
            })

            const distanceToEnd = turfLength(navigationPath) * 1000
            console.log(distanceToEnd)
            if (distanceToEnd < 5) {
              this.snackbar.showMessage({
                text: '目的地就在附近',
                actionVisiable: true,
                actionText: '结束导航',
                onAction: () => {
                  navigationTask.stop()
                },
                timeout: 5000
              })
            }
          })
          .start()
      })
      .attach(renderer)

    // 搜索框
    this.featureSearch
      .setDataSource(cartogramCollection)
      .on('feature-select', (selectedFeature: CartogramFeature) => {
        this.selectedFeature = selectedFeature
        const cartogram = cartogramCollection.floors
          .find(f => f.id === selectedFeature.properties.cartogram_id) as Cartogram
        renderer
          .setCurrentCartogramSourceData(cartogram)
          .focusFeature(selectedFeature)
        this.droppingPointMarker.update({
          visiable: true,
          position: turfCenterOfMass(selectedFeature, selectedFeature.properties) as NavigationPosition
        })
        this.selectedFeaturePopup.update({
          visiable: true,
          feature: selectedFeature,
          confirmText: this.finishingPoint && !this.startingPoint ? '设置起点' : '去这里'
        })
      })
      .attach(renderer)
  }

  componentDidMount () {
    this.renderer.attach(this.mapaContainer.current as HTMLDivElement)
  }

  render () {
    return (
      <div className='mapa-container' ref={this.mapaContainer}></div>
    )
  }
}

export default App
