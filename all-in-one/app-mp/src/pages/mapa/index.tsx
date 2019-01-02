import Taro, { Component, Config } from '@tarojs/taro'
import {
  WebView,
} from '@tarojs/components'
import './mapa.css'
import Scanner from '@jcmap-sdk-web/wxmp-beacon-scanner';
import {
  defer,
  fromEvent,
  of,
  race,
  timer,
  merge,
} from 'rxjs';
import {
  filter,
  share,
  shareReplay,
  switchMap,
  tap,
  throttle,
  withLatestFrom,
} from 'rxjs/operators';
import nanoid from 'nanoid/non-secure';
import {
  hideToast,
  showToast,
} from '@jcmap-sdk-web/wxmp-better-api';
import url from 'url';
import qs from 'qs';
import BeaconPusher from '@jcmap-sdk-web/beacon-pusher';


const isProd = process.env.NODE_ENV === 'production';

// websocket 通信session名称，确保 小程序 和 导航页面 在同一通道
const session =true || isProd ? nanoid(10) : 'development';

// 导航页面地址
// const baseWebAppUri = isProd ? 'https://indoorgo.weapp.jcbel.com/' : 'https://example.com';
const baseWebAppUri = isProd ? 'https://indoorgo.weapp.jcbel.com/' : 'http://192.168.89.138:3000';

const parsedBaseWebAppUri = url.parse(baseWebAppUri, true);

function fullWebAppUri(params?: Query) {
  const query = {
    session: session,
    ...params,
  };

  return url.format({
    ...parsedBaseWebAppUri,
    query,
  });
}

const baseBeaconBrokerUri = 'https://beacon-p2p.jcmap.jcbel.com/';

const parsedBaseBeaconBrokerUri = url.parse(baseBeaconBrokerUri, true);

const fullWebsocketBrokerUri = url.format({
  ...parsedBaseBeaconBrokerUri,
  protocol: parsedBaseBeaconBrokerUri.protocol === 'http:' ? 'ws:' : 'wss',
  query: {
    type: 'push',
    session,
  },
});

const fullHttpBrokerUri = url.format({
  ...parsedBaseBeaconBrokerUri,
  query: {
    type: 'push',
    session,
  },
});

const beaconPusher$ = defer(() => {
  const beaconPusher = new BeaconPusher({
    websocketBrokerUri: fullWebsocketBrokerUri,
    httpBrokerUri: fullHttpBrokerUri,
  });

  return of(beaconPusher);
})
  .pipe(
    shareReplay(1),
  );

const beaconScanner$ = defer(() => {
  const beaconScanner = new Scanner({
    uuids: [
      'F0F0C1C1-0001-0000-00FF-FFFF0A020000',
      'F0F0C1C1-0001-0000-00FF-FFFF0A030000',
    ],
  });
  return of(beaconScanner);
})
  .pipe(
    shareReplay(1),
  );

// 处理错误
const handleScannerError$ = beaconScanner$
  .pipe(
    switchMap(scanner => fromEvent(scanner, 'error')),
    tap(console.error.bind(console)),
    share(),
  );

const bluetoothState$ = beaconScanner$
  .pipe(
    switchMap(scanner => fromEvent(scanner, 'bluetooth-adapter-state-change')),
    share(),
  );

// 监控蓝牙状态并提示
const handleBluetoothClose$ = bluetoothState$
  .pipe(
    filter(x => !x),
    throttle(() => {
      return race(
        timer(10000),
        bluetoothState$
          .pipe(
            filter(x => x),
          ),
      );
    }),
    tap(() => {
      showToast({
        title: '蓝牙服务未开启',
        duration: 10000,
        icon: 'none',
      });
    }),
    share(),
  );

const handleBluetoothOpen$ = bluetoothState$
  .pipe(
    filter(x => x),
    tap(() => {
      hideToast();
    }),
    share(),
  );

const scannedBeacons$ = beaconScanner$
  .pipe(
    switchMap(scanner => fromEvent(scanner, 'beacon')),
    share(),
  );

// 处理标签发现
const handleScannerFoundBeacon$ = scannedBeacons$
  .pipe(
    withLatestFrom(beaconPusher$),
    tap(([beacons, beaconPusher]) => {
      beaconPusher.push(beacons);
    }),
    shareReplay(1),
  );

const loop$ = merge(
  handleScannerError$,
  handleBluetoothClose$,
  handleBluetoothOpen$,
  handleScannerFoundBeacon$,
);

interface Query {
  fcid: string;
  flng: number;
  flat: number;
  session?: string;
}

interface Location {
  cid: string;
  lng: number;
  lat: number;
}

interface State {
  fullWebAppUri: string;
  latestLocation?: Location;
}

interface WebViewMessageEvent {
  detail: {
    data: Location[];
  };
}

export default class Mapa extends Component<object, State> {

  config: Config = {
    navigationBarTitleText: 'IndoorGo'
  }

  state: State = {
    fullWebAppUri: fullWebAppUri(),
  }

  task = loop$.subscribe();

  componentWillUnmount() {
    console.log('component will unmount')
    beaconScanner$.subscribe(scanner => scanner.destroy());
    beaconPusher$.subscribe(wsc => wsc.close());
    this.task.unsubscribe();
  }

  componentDidShow() {
    console.log('component show')
    beaconScanner$.subscribe(scanner => scanner.start());
  }

  componentDidHide() {
    console.log('component hide')
    beaconScanner$.subscribe(scanner => scanner.stop());
  }

  onShareAppMessage() {
    let path = '/pages/mapa/mapa';
    const latestLocation = this.state.latestLocation;
    if (latestLocation !== undefined) {
      const { cid, lng, lat } = latestLocation;
      path += qs.stringify(
        {
          fcid: cid,
          flat: lat,
          flng: lng,
        },
        {
          addQueryPrefix: true,
        },
      );
    }

    return {
      title: 'IndoorGo 导航',
      path,
    };
  }

  render () {

    return (
      <WebView src={this.state.fullWebAppUri} onMessage={this.handlePageMessage} />
    )
  }

  handlePageMessage(evt: WebViewMessageEvent) {
    const data = evt.detail.data;
    this.setState(state => ({
      ...state,
      lastestLocation: data[data.length - 1],
    }));
  }
}
