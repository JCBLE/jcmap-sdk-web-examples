// 自定义 Marker
import { MarkerControl } from '@jcmap-sdk-web/renderer'

export class FinishingPointMarker extends MarkerControl {

  constructor () {
    super({
      iconSrc: require('./assets/目的地.svg')
    })
    this.markerElement.style.backgroundSize = 'contain'
  }
}

export default FinishingPointMarker
