import React, { Component } from 'react'
import './App.css'
import {
  CartogramSwitcher,
  DroppingPointMarker,
  FeaturePicker,
  FeatureSearchControl,
  LocationMarker,
  NavegadorControl,
  NavigationLinePreviewer,
  Renderer,
  SelectedFeatureControl,
  Snackbar,
  StartingPointMarker,
  defaultNavegadorLinePaint,
  defaultNavegadorLineLayout
} from '@jcmap-sdk-web/renderer'
import mapData from './cartogram-collection.json'
import { decodeMapData } from './utils'
import BeaconLocator from '@jcmap-sdk-web/beacon-locator'
import FusionLocator from '@jcmap-sdk-web/fusion-locator'
import {
  Cartogram,
  CartogramFeature,
  Navegador,
  NavegadorTask,
  NavigationInfo,
  NavigationMode,
  NavigationPosition,
  CartogramCollection
} from '@jcmap-sdk-web/navegador'
import BeaconPuller from '@jcmap-sdk-web/beacon-puller'
import {
  parse as urlParse
} from 'url'
import turfCenterOfMass from '@turf/center-of-mass'
import turfLength from '@turf/length'
import LocateMyselfButton from './LocateMyselfButton'
import FinishingPointMarker from './FinishingPointMarker'

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
  startingPointFeaturePopup = new SelectedFeatureControl()
  finishingPointFeaturePopup = new SelectedFeatureControl()
  previewFeaturePopup = new SelectedFeatureControl()
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
  iconSet: { [key: string]: any } = {
    'atm':  require('./icons/atm.png'),
    'bus':  require('./icons/bus.png'),
    'coach':  require('./icons/coach.png'),
    'drinking water':  require('./icons/drinking water.png'),
    'Entrance and exit':  require('./icons/Entrance and exit.png'),
    'Entrance':  require('./icons/Entrance.png'),
    'escalator':  require('./icons/escalator.png'),
    'escape exit':  require('./icons/escape exit.png'),
    'Export':  require('./icons/Export.png'),
    'Handicapped restroom':  require('./icons/Handicapped restroom.png'),
    'infirmary':  require('./icons/infirmary.png'),
    'lift':  require('./icons/lift.png'),
    'net car':  require('./icons/net car.png'),
    'nursery room':  require('./icons/nursery room.png'),
    'Parking autonomous payment machine':  require('./icons/Parking autonomous payment machine.png'),
    'parking lot':  require('./icons/parking lot.png'),
    'police':  require('./icons/police.png'),
    'rail ticket office':  require('./icons/rail ticket office.png'),
    'service desk':  require('./icons/service desk.png'),
    'stair':  require('./icons/stair.png'),
    'supermarket':  require('./icons/supermarket.png'),
    'taxi':  require('./icons/taxi.png'),
    'toilet':  require('./icons/toilet.png'),
    'Train outbound Lobby':  require('./icons/Train outbound Lobby.png'),
    'vending machine':  require('./icons/vending machine.png')
  }

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
      .attach(renderer, 'bottom-left')

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
      .attach(renderer, 'bottom-right')

    // 当前位置显示组件
    this.locationMarker.attach(renderer)

    // Dropping Marker
    this.droppingPointMarker.attach(renderer)

    // 终点
    this.finishingPointMarker.attach(renderer)

    // 起点
    this.startingPointMarker.attach(renderer)

    // 起点信息展示
    const startingPointFeaturePopup = this.startingPointFeaturePopup
    startingPointFeaturePopup
      .on('confirm', (selectedFeature) => {
        this.droppingPointMarker.update({ visiable: false })
        startingPointFeaturePopup.update({ visiable: false })

        const featureCenter = turfCenterOfMass(selectedFeature, selectedFeature.properties) as NavigationPosition

        this.startingPoint = featureCenter
        this.startingPointMarker.update({ visiable: true, position: featureCenter })

        navigationLinePreviewer.update({
          visiable: true,
          startingPoint: this.startingPoint,
          finishingPoint: this.finishingPoint
        })
        if (this.startingPoint && this.finishingPoint) {
          this.previewFeaturePopup.update({
            visiable: true,
            feature: this.finishingPoint as any,
            confirmText: '开始导航'
          })
        }
      })
      .on('cancel', () => {
        this.droppingPointMarker.update({ visiable: false })
      })
      .attach(renderer, 'bottom')

    // 终点信息展示
    const finishingPointFeaturePopup = this.finishingPointFeaturePopup
    finishingPointFeaturePopup
      .on('confirm', (selectedFeature) => {
        this.droppingPointMarker.update({ visiable: false })
        this.finishingPointFeaturePopup.update({ visiable: false })

        const featureCenter = turfCenterOfMass(selectedFeature, selectedFeature.properties) as NavigationPosition

        this.finishingPoint = featureCenter
        this.finishingPointMarker.update({ visiable: true, position: featureCenter })

        if (!this.startingPoint && this.latestLocation) {
          this.startingPoint = this.latestLocation
          this.startingPointMarker.update({ visiable: true, position: this.latestLocation })
        }

        navigationLinePreviewer.update({
          visiable: true,
          startingPoint: this.startingPoint,
          finishingPoint: this.finishingPoint
        })
        if (this.startingPoint && this.finishingPoint) {
          this.previewFeaturePopup.update({
            visiable: true,
            feature: this.finishingPoint as any,
            confirmText: '开始导航'
          })
        }
      })
      .on('cancel', () => {
        this.droppingPointMarker.update({ visiable: false })
      })
      .attach(renderer, 'bottom')

    // 预览终点信息展示
    const previewFeaturePopup = this.previewFeaturePopup
    previewFeaturePopup
      .on('confirm', () => {
        const { navigationMode, startingPoint, finishingPoint } = this
        this.droppingPointMarker.update({ visiable: false })
        previewFeaturePopup.update({ visiable: false })

        navigationLinePreviewer.update({ visiable: false })
        this.startingPointMarker.update({ visiable: false })
        this.featureSearch.update({ visiable: false })
        if (this.navigationTask) {
          console.error(new Error('已经有导航任务在运行'))
        }
        const navigationTask = this.navigationTask = navegador.startNavigation(navigationMode, startingPoint!, finishingPoint!)
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
              navigationStatus,
              footer: genFeatureItem(cartogramCollection, this.iconSet, this.finishingPoint! as any)
            })

            const distanceToEnd = turfLength(navigationPath) * 1000
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
      .on('cancel', () => {
        this.droppingPointMarker.update({ visiable: false })
      })
      .attach(renderer, 'bottom')

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
        if (this.finishingPoint && !this.startingPoint) {
          this.startingPointFeaturePopup.update({
            visiable: true,
            feature: selectedFeature,
            confirmText: '设置起点'
          })
        } else {
          this.finishingPointFeaturePopup.update({
            visiable: true,
            feature: selectedFeature,
            confirmText: '去这里'
          })
        }
      })
      .attach(renderer)

    // Snackbar
    this.snackbar.attach(renderer, 'bottom')

    // 导航模式组件
    const router = new NavegadorControl({})
    router
      .on('stop', () => {
        this.featureSearch.update({ visiable: true })
      })
      .attach(renderer, 'top')

    // 线路预览
    const navigationLinePreviewer = this.navigationLinePreviewer = new NavigationLinePreviewer({
      navegador: navegador,
      navigationMode: this.navigationMode,
      startingPoint: this.startingPoint,
      finishingPoint: this.finishingPoint,
      linePaint: {
        ...defaultNavegadorLinePaint,
        'line-opacity': 1
      },
      lineLayout: {
        ...defaultNavegadorLineLayout,
        'line-cap': 'round',
        'line-join': 'round'
      },
      arrowImg: require('./images/jiantou.png')
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
      .attach(renderer, 'top')

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
        if (this.finishingPoint && !this.startingPoint) {
          this.startingPointFeaturePopup.update({
            visiable: true,
            feature: selectedFeature,
            confirmText: '设置起点'
          })
        } else {
          this.finishingPointFeaturePopup.update({
            visiable: true,
            feature: selectedFeature,
            confirmText: '去这里'
          })
        }
      })
      .attach(renderer, 'top')
  }

  componentDidMount () {
    this.renderer.attach(this.mapaContainer.current as HTMLDivElement)
  }

  render () {
    return (
      <div style={{ height: '100vh' }} ref={this.mapaContainer}></div>
    )
  }
}

export default App

function getFeatureIcon (iconSet: { [key: string]: any }, feature: CartogramFeature) {
  const layerCode = feature.properties['layer:code']
  let icon

  switch (layerCode) {
    case 'icon':
      icon = iconSet[feature.properties.type]
      break
    case 'park':
    default:
      icon = require('./icons/kongchewei.png')
      break
  }

  return icon
}

function findCartogram (cartogramCollections: CartogramCollection, feature: CartogramFeature) {
  return cartogramCollections.floors.find(f => f.id === feature.properties.cartogram_id)
}

function genFeatureItem (cartogramCollection: any, iconSet: any, feature: CartogramFeature) {
  const cartogram = findCartogram(cartogramCollection, feature)
  const icon = getFeatureIcon(iconSet, feature)

  return {
    visiable: true,
    feature,
    id: feature.id + '',
    icon,
    title: feature.properties.name || '',
    detail: cartogram && cartogram.properties.floor_label || ''
  }
}
