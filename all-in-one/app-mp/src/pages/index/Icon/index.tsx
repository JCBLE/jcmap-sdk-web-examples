import Taro, { Component } from '@tarojs/taro'
import {
  View,
  Text,
  Image,
} from '@tarojs/components'
import './icon.css'


interface IconConfig {
  text: string;
  image: string;
}

interface Props extends IconConfig {
  onClick: (data: IconConfig) => void;
}

export class Icon extends Component<Props, object> {

  render () {
    const {
      image,
      text,
      onClick,
    } = this.props;

    return (
      <View className='icon-container' onClick={onClick.bind(null ,{ text, image })}>
        <Image src={image} className='icon-image' />
        <Text className='icon-text'>{text}</Text>
      </View>
    )
  }
}

export default Icon;
