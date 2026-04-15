// frontend/src/components/MarkerClusterGroup.jsx
import { createPathComponent } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Esta función conecta directamente el plugin original de Leaflet con el contexto de React-Leaflet v4+
const MarkerClusterGroup = createPathComponent(
  ({ children: _c, ...props }, ctx) => {
    const clusterProps = {};
    const clusterEvents = {};

    // Separa las propiedades de configuración de los eventos (ej. onClick)
    Object.entries(props).forEach(([propName, prop]) => {
      if (propName.startsWith('on')) {
        clusterEvents[propName] = prop;
      } else {
        clusterProps[propName] = prop;
      }
    });

    // Instancia el motor original de leaflet.markercluster
    const markerClusterGroup = L.markerClusterGroup(clusterProps);

    // Adjunta los eventos
    Object.entries(clusterEvents).forEach(([eventAsProp, callback]) => {
      const clusterEvent = `cluster${eventAsProp.substring(2).toLowerCase()}`;
      markerClusterGroup.on(clusterEvent, callback);
    });

    return {
      instance: markerClusterGroup,
      context: { ...ctx, layerContainer: markerClusterGroup },
    };
  }
);

export default MarkerClusterGroup;