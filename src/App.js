import './App.css'
import React from 'react'
import DeckGL from '@deck.gl/react'
import { ArcLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import mapboxgl from 'mapbox-gl'
import { StaticMap } from 'react-map-gl'
import InfoPanel from './InfoPanel'

const MAP_BOX_ACCESS_TOKEN = process.env.REACT_APP_INTER_PRISON_TRANSFER_MAP_BOX_KEY
const MAP_BOX_STYLE_ID = process.env.REACT_APP_INTER_PRISON_TRANSFER_MAP_BOX_ID

const DEFAULT_SOURCE_COLOUR = [0, 0, 0, 40]
const POPULATION_SOURCE_COLOUR = [255, 0, 0, 40]

const DEFAULT_TARGET_COLOUR = [255, 255, 255, 40]
const POPULATION_TARGET_COLOUR = [255, 0, 0, 40]

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
    min: 0, value: 2
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
const heatmapLayerColourRange = [
  [255, 255, 255],
  [0, 0, 0]
]
const zoom = 5.0
const viewState = {
  longitude: 173.5886324,
  latitude: -41.7409396,
  pitch: 45,
  bearing: 0,
  zoom,
  minZoom: zoom,
  maxZoom: zoom,
}

const sourcePosition = (d) => {
  return d.Transfer_From_Coordinates
}
const targetPosition = d => d.Transfer_To_Coordinates

function App() {
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
          data={url}
          getWidth={2}
          getTilt={90}
          getSourcePosition={sourcePosition}
          getTargetPosition={targetPosition}
          getSourceColor={getSourceColour}
          getTargetColor={getTargetColour}
          getFrequency={1.0}
          animationSpeed={0.001}
          tailLength={0.5}
        />
        <HeatmapLayer
          id='heatmapLayer'
          data={url}
          pickable={false}
          radiusPixels={800}
          getPosition={(d) => d.Transfer_From_Coordinates}
          colorRange={heatmapLayerColourRange}
        />
      </DeckGL>
      <InfoPanel />
    </div>
  )
}
// reuseMaps
// preventStyleDiffing

export default App
