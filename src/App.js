import './App.css'
import React, { useState, useRef, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { TRANSITION_EVENTS } from 'deck.gl'
import { MapboxLayer } from '@deck.gl/mapbox'
import { ArcLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { LinearInterpolator } from '@deck.gl/core'
import mapboxgl from 'mapbox-gl'

const BLUE_RGB = [255, 255, 255, 40]
const RED_RGB = [0, 0, 0, 40]
const url = process.env.REACT_APP_INTER_PRISON_TRANSFERS_CLOUD_STORAGE + 'inter-prison-transfers.json'

const transitionInterpolator = new LinearInterpolator({
  transitionProps: ['bearing', 'zoom', 'pitch']
})
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
    min: 0, value: 1
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
    console.log('drawing')
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
const animatedId = 'arc-layer'
//  + Date.now()

function App() {
  const [glContext, setGLContext] = useState()
  const [hoverInfo, setHoverInfo] = useState()
  const deckRef = useRef(null)
  const mapRef = useRef(null)
  const tooltip = ({ Object }) => ({ html: hoverInfo })
  const zoom = 5.0
  const [viewState, setViewState] = useState({
    longitude: 173.5886324,
    latitude: -41.7409396,
    pitch: 45,
    bearing: 0,
    zoom
  })

  const rotateCamera = useCallback(() => {
    setViewState((viewState) => (
      {
        ...viewState,

        pitch: 90,
        bearing: 30,
        zoom,
        transitionDuration: 7000,
        transitionInterpolator,
        transitionInterruption: TRANSITION_EVENTS.BREAK
      }))
  }, [])

  const onViewStateChange = useCallback(
    ({ viewState, interactionState }) => {
      const { isDragging, isPanning, isRotating, isZooming } = interactionState
      if (isDragging || isPanning || isRotating || isZooming) {
        setViewState((viewState) => ({
          ...viewState,
          transitionDuration: 0,
          transitionInterpolator,
          transitionInterruption: TRANSITION_EVENTS.BREAK
        }))
      }
    },
    []
  )

  const onMapLoad = useCallback(() => {
    const map = mapRef.current.getMap()
    const deck = deckRef.current.deck

    const layers = map.getStyle().layers
    const firstLabelLayerId = layers.find(
      (layer) => layer.type === 'symbol'
    ).id

    map.addLayer(new MapboxLayer({ id: 'grid-layer', deck }), firstLabelLayerId)
    map.addLayer(
      new MapboxLayer({ id: 'arc-layer', deck }),
      firstLabelLayerId
    )

    rotateCamera()
  }, [rotateCamera])

  return (
    <DeckGL
      // getTooltip={tooltip}
      ref={deckRef}
      controller
      mapStyle='https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
      initialViewState={viewState}
      onViewStateChange={onViewStateChange}
      onWebGLInitialized={setGLContext}
      glOptions={{
        /* To render vector tile polygons correctly */
        stencil: true
      }}
    >
      <AnimatedArcLayer
        id={animatedId}
        data={url}
        getSourcePosition={d => d.Transfer_From_Coordinates}
        getTargetPosition={d => d.Transfer_To_Coordinates}
        getWidth={2}
        getTilt={90}
        getTargetColor={BLUE_RGB}
        getSourceColor={RED_RGB}
        getFrequency={1.0}
        animationSpeed={0.001}
        tailLength={0.5}
      />
      <HeatmapLayer
        id='heatmapLayer'
        data={url}
        radiusPixels={800}
        getPosition={d => d.Transfer_From_Coordinates}
        getWeight={55}
        aggregation={'SUM'}
        colorRange={[[255, 255, 255], [0, 0, 0]]}
      />
    </DeckGL>
  )
}
// reuseMaps
// preventStyleDiffing

export default App
