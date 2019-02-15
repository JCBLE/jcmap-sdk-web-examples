// 自定义组件
import { NativeControl } from '@jcmap-sdk-web/renderer'
import { css } from 'emotion'
import { el } from 'redom'

const style = {
  container: css`
    height: 48px;
    width: 48px;
    border-radius: 50%;
    margin-right: 5vw;
    margin-bottom: 3vw;
    pointer-events: initial;
  `
}

export class LocateMyselfButton extends NativeControl {
  el: HTMLElement

  constructor () {
    super()
    this.el = el(
      `div.${style.container}`,
      (elem: HTMLElement) => {
        elem.addEventListener('click', () => {
          this.emit('press')
        })
      },
      el(
        'img',
        {
          src: require('./assets/定位.svg')
        }
      )
    )
  }
}

export default LocateMyselfButton
