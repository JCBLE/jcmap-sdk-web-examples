import { CartogramCollection } from '@jcmap-sdk-web/navegador'

export function decodeMapData (mapData: any): CartogramCollection {
  if (mapData.version < '2' || mapData.version >= '3') {
    throw new Error('invalid map data version, require: 2.x.x but get ' + mapData.version)
  }

  const floors = mapData.floors.map((floor: any) => {
    const features = floor.features.map((feature: any) => {
      const properties = {
        ...feature.properties,
        cartogram_id: floor.id
      }
      return {
        ...feature,
        properties
      }
    })
    return {
      ...floor,
      type: 'FeatureCollection',
      features
    }
  })
  return {
    ...mapData,
    floors
  }
}
