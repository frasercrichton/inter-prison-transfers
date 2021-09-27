import './App.css'
import React, { useState, useRef, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { TRANSITION_EVENTS } from 'deck.gl'
import { MapboxLayer } from '@deck.gl/mapbox'
import { ArcLayer } from '@deck.gl/layers'
import { GridLayer } from '@deck.gl/aggregation-layers'
import { StaticMap } from 'react-map-gl'
import { LinearInterpolator } from '@deck.gl/core'
import data from './data/transfers.json'

const MAP_BOX_ACCESS_TOKEN = process.env.REACT_APP_MAP_LEAFLET_KEY
const BLUE_RGB = [0, 0, 255, 40]
const RED_RGB = [240, 100, 0, 40]

const cloudUrl = process.env.REACT_APP_INTER_PRISON_TRANSFERS_CLOUD_STORAGE

const url = cloudUrl + 'inter-prison-transfers.json'

const transitionInterpolator = new LinearInterpolator({
  transitionProps: ['bearing', 'zoom', 'pitch']
})
// // auto_highlight: true
// "From: {From} To: {To} Reason: {Reason} Transfer Date: {'Transfer Date'} Status At Transfer: {'Status At Transfer'} <br /> From in red; To in blue"

function App () {
  const [glContext, setGLContext] = useState()
  const [hoverInfo, setHoverInfo] = useState()
  const deckRef = useRef(null)
  const mapRef = useRef(null)
  const tooltip = ({ Object }) => ({ html: hoverInfo })
  const [viewState, setViewState] = useState({
    longitude: 173.5886324,
    latitude: -41.7409396,
    pitch: 45,
    bearing: 0,
    zoom: 4.0
  })

  const rotateCamera = useCallback(() => {
    setViewState((viewState) => (
      {
        ...viewState,
        bearing: 30,
        zoom: 5.0,
        pitch: 70,
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
      getTooltip={tooltip}
      ref={deckRef}
      controller
      initialViewState={viewState}
      onViewStateChange={onViewStateChange}
      onWebGLInitialized={setGLContext}
      glOptions={{
        /* To render vector tile polygons correctly */
        stencil: true
      }}
    >
      <ArcLayer
        id='arc-layer'
        data={url}
        getSourcePosition={d => d.Transfer_From_Coordinates}
        getTargetPosition={d => d.Transfer_To_Coordinates}
        getSourceColor={RED_RGB}
        getTargetColor={BLUE_RGB}
        getWidth={1}
        getTilt={70}
        onHover={setHoverInfo}
      />
      <StaticMap
        ref={mapRef}
        gl={glContext}
        mapboxApiAccessToken={MAP_BOX_ACCESS_TOKEN}
        onLoad={onMapLoad}
      />
      <GridLayer
        id='grid-layer'
        data={data}
        packable
        extruded
        cellSize={20000}
        elevationScale={400}
        getPosition={d => d.Transfer_From_Coordinates}
        colorRange={[RED_RGB]}
        opacity={1.0}
      />
    </DeckGL>
  )
}
// reuseMaps
// preventStyleDiffing

export default App
