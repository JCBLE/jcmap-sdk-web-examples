import '@tarojs/async-await';
import Taro, { Component, Config } from '@tarojs/taro';
import './app.css';

// import Index from './pages/index';
import Mapa from './pages/mapa';


class App extends Component {

  config: Config = {
    pages: [
      'pages/mapa/index',
      'pages/index/index',
    ],
    window: {
      backgroundTextStyle: 'light',
      navigationBarBackgroundColor: '#fff',
      navigationBarTitleText: 'IndoorGo',
      navigationBarTextStyle: 'black'
    }
  }

  componentDidMount () {}

  componentDidShow () {}

  componentDidHide () {}

  componentCatchError () {}

  render () {
    return (
      <Mapa />
    )
  }
}

Taro.render(<App />, document.getElementById('app'))
