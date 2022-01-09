import './App.css'
import React, { useState, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import { JSONLoader } from '@loaders.gl/json'
import { load } from '@loaders.gl/core'
import mapboxgl from 'mapbox-gl'
import { StaticMap } from 'react-map-gl'
import InfoPanel from './InfoPanel'

import counts from './inter-prison-transfers-counts.json'
import populationcounts from './inter-prison-transfers-population-management-counts.json'
const MAP_BOX_ACCESS_TOKEN = process.env.REACT_APP_INTER_PRISON_TRANSFER_MAP_BOX_KEY
const MAP_BOX_STYLE_ID = process.env.REACT_APP_INTER_PRISON_TRANSFER_MAP_BOX_ID

const DEFAULT_SOURCE_COLOUR = [255, 255, 255]
const DEFAULT_TARGET_COLOUR = [255, 255, 255]

const POPULATION_SOURCE_COLOUR = [255, 0, 0]
const POPULATION_TARGET_COLOUR = [255, 0, 0]

const lineColour = (d) => [0, 0, 0]
const fillColour = (d) => [0, 0, 255]

const getSourceColour = (item) => {
  return (item.Reason === "Population Management") ? POPULATION_SOURCE_COLOUR : DEFAULT_SOURCE_COLOUR
}

const getTargetColour = (item) => {
  return (item.Reason === "Population Management") ? POPULATION_TARGET_COLOUR : DEFAULT_TARGET_COLOUR
}

const url = process.env.REACT_APP_INTER_PRISON_TRANSFERS_CLOUD_STORAGE + 'inter-prison-transfers.json'

// // auto_highlight: true
// "From: {From} To: {To} Reason: {Reason} Transfer Date: {'Transfer Date'} Status At Transfer: {'Status At Transfer'} <br /> From in red; To in blue"
// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default

const defaultProps = {
  // Frequency of the running light
  getFrequency: {
    type: 'accessor',
    value: 1
  },
  // Speed of the running light
  animationSpeed: {
    type: 'number',
    min: 0,
    value: 1
  },
  // Size of the blob
  tailLength: {
    type: 'number',
    min: 0, 
    value: 2
  }
}

const vsDeclaration = `
attribute float instanceFrequency;
varying float vArcLength;
varying float vFrequency;`

const vsMain = `
vArcLength = distance(source, target);
vFrequency = instanceFrequency;
`
const fsDeclaration = `
uniform float tailLength;
uniform float timestamp;
uniform float animationSpeed;

varying float vArcLength;
varying float vFrequency;`

const fsColorFilter = `
float tripDuration = vArcLength / animationSpeed;
float flightInterval = 1.0 / vFrequency;
float r = mod(geometry.uv.x, flightInterval);

// Head of the trip (alpha = 1.0)
float rMax = mod(fract(timestamp / tripDuration), flightInterval);
// Tail of the trip (alpha = 0.0)
float rMin = rMax - tailLength / vArcLength;
// Two consecutive trips can overlap
float alpha = (r > rMax ? 0.0 : smoothstep(rMin, rMax, r)) + smoothstep(rMin + flightInterval, rMax + flightInterval, r);
if (alpha == 0.0) {
  discard;
}
color.a *= alpha;
`
const settings = {
  touchZoom: false,
  scrollWheelZoom: false,
  touchRotate: false,
  dragPan: false,
  dragRotate: false,
  scrollZoom: false,
}

class AnimatedArcLayer extends ArcLayer {

  initializeState(params) {
    super.initializeState(params);

    this.getAttributeManager().addInstanced({
      instanceFrequency: {
        size: 1,
        accessor: 'getFrequency',
        defaultValue: 1
      },
    });
  }

  draw(opts) {
    this.state.model.setUniforms({
      tailLength: this.props.tailLength,
      animationSpeed: this.props.animationSpeed,
      timestamp: Date.now() % 86400000
    });
    super.draw(opts);

    // By default, the needsRedraw flag is cleared at each render. We want the layer to continue
    // refreshing.
    this.setNeedsRedraw();
  }

  getShaders() {
    return {
      ...super.getShaders(),
      inject: {
        'vs:#decl': vsDeclaration,
        'vs:#main-end': vsMain,
        'fs:#decl': fsDeclaration,
        'fs:DECKGL_FILTER_COLOR': fsColorFilter
      }

    }
  }

}
AnimatedArcLayer.layerName = 'AnimatedArcLayer'
AnimatedArcLayer.defaultProps = defaultProps

//  + Date.now()
// const heatmapLayerColourRange = [
//   [255, 255, 255],
//   [0, 0, 0]
// ]
const zoom = 5.0
const viewState = {
  longitude: 173.5886324,
  latitude: -41.7409396,
  pitch: 0,
  bearing: 0,
  zoom,
  minZoom: zoom,
  maxZoom: zoom,
}

const sourcePosition = (d) => {
  return d.Transfer_From_Coordinates
}
const targetPosition = d => d.Transfer_To_Coordinates

const App = () => {

  const [data, setData] = useState()

  const [dataPopManagaed, setDataPopManagaed] = useState()

  useEffect(() => {
    const dataLoad = async () => {
      const res = await load(url, JSONLoader)
      setDataPopManagaed(res.filter((d) => d.Reason === 'Population Management'))
      setData(res);
    }
    dataLoad()
  }, [])

  return (
    <div>
      <DeckGL
        controller={{ ...settings }}
        initialViewState={viewState}
      >
        <StaticMap
          mapboxApiAccessToken={MAP_BOX_ACCESS_TOKEN}
          mapStyle={MAP_BOX_STYLE_ID}
        />
        <AnimatedArcLayer
          id='arc-layer'
          data={data}
          getTilt={90}
          getSourcePosition={sourcePosition}
          getTargetPosition={targetPosition}
          getSourceColor={getSourceColour}
          getTargetColor={getTargetColour}

          // a day??
          getFrequency={3.0}
          // the time period?
          animationSpeed={0.0001}
          tailLength={0.6}
        />


        <ScatterplotLayer
          id='ScatterplotLayer2'
          data={counts}
          pickable={false}
          opacity={0.1}
          stroked={true}
          filled={true}
          getPosition={(d) => d.Transfer_From_Coordinates}
          getFillColor={fillColour()}
          getLineColor={lineColour}
          radiusScale={160}
          radiusMinPixels={1}
          radiusMaxPixels={1000}
          getRadius={d => d["transfer-count"] / 10}
        />
        <ScatterplotLayer
          id='ScatterplotLayer'
          data={populationcounts}
          pickable={false}
          opacity={1}
          stroked={true}
          filled={true}
          radiusScale={160}
          radiusMinPixels={1}
          radiusMaxPixels={1000}
          getPosition={(d) => d.Transfer_From_Coordinates}
          getRadius={d => d["count"] / 10}
          getFillColor={d => [255, 0, 0]}
          getLineColor={lineColour}
        />

      </DeckGL>
      <InfoPanel />
    </div>
  )
}
// reuseMaps
// preventStyleDiffing

export default App

