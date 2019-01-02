import Taro, { Component, Config } from '@tarojs/taro'
import {
  View,
  Text,
  Input,
} from '@tarojs/components'
import './index.css'
import CustomIcon from './Icon';
import uber from '../../assets/images/网约车.png';


const hotKeywords = [
  {
    text: '接人/到达',
    image: uber,
  },
  {
    text: '空车位查询',
    image: uber,
  },
  {
    text: '送人/出发',
    image: uber,
  },
  {
    text: '反向找车',
    image: uber,
  },
];

const ticketServices = [
  {
    text: '取票',
    image: uber,
  },
  {
    text: '售票',
    image: uber,
  },
  {
    text: '人工窗口',
    image: uber,
  },
];

const travelServices = [
  {
    text: '网约车',
    image: uber,
  },
  {
    text: '出租车',
    image: uber,
  },
  {
    text: '公交车',
    image: uber,
  },
  {
    text: '地铁',
    image: uber,
  },
];


export default class Index extends Component {

  /**
   * 指定config的类型声明为: Taro.Config
   *
   * 由于 typescript 对于 object 类型推导只能推出 Key 的基本类型
   * 对于像 navigationBarTextStyle: 'black' 这样的推导出的类型是 string
   * 提示和声明 navigationBarTextStyle: 'black' | 'white' 类型冲突, 需要显示声明类型
   */
  config: Config = {
    navigationBarTitleText: 'IndoorGo'
  }

  componentWillMount () { }

  componentDidMount () { }

  componentWillUnmount () { }

  componentDidShow () { }

  componentDidHide () { }

  render () {

    return (
      <View className='page-container'>
        <View style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Input
            placeholder='搜设施 车位 店铺 ... ...'
            value=''
          />
        </View>

        <View className='shortcut-container' style={{ flex: 6, justifyContent: 'space-around' }}>
          <Text className='h1-title'>常用地点</Text>

          <View className='section-container'>
            <Text className='h2-title'>热们关键词</Text>

            <View className='sub-container' style={{ flexWrap: 'nowrap' }}>
              {hotKeywords.map((keyword) => (
                <View key={keyword.text} style={{ width: '25%' }}>
                  <CustomIcon text={keyword.text} image={keyword.image} onClick={this.handleClick} />
                </View>
              ))}
            </View>
          </View>

          <View className='section-container'>
            <Text className='h2-title'>票务服务</Text>

            <View className='sub-container'>
              {ticketServices.map((service) => (
                <View key={service.text} style={{ width: '33.333333333%' }}>
                  <CustomIcon text={service.text} image={service.image} onClick={this.handleClick} />
                </View>
              ))}
            </View>
          </View>

          <View className='section-container'>
            <Text className='h2-title'>出行</Text>

            <View className='sub-container'>
              {travelServices.map((service) => (
                <View key={service.text} style={{ width: '33.333333333%' }}>
                  <CustomIcon text={service.text} image={service.image} onClick={this.handleClick} />
                </View>
              ))}
            </View>
          </View>
        </View>

        <View>
          <Text onClick={this.gotoMap}>进入室内地图定位模式</Text>
        </View>
      </View>
    )
  }

  handleClick = (iconConfig) => {
    console.log(iconConfig);
  }

  gotoMap = () => {
    Taro.navigateTo({
      url: '/pages/mapa/mapa?timestamp=' + Date.now() + '&abc=weourwore',
    });
  }
}
