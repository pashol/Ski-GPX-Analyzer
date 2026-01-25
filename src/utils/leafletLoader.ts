import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon paths for bundled Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Export L globally for components expecting window.L
if (typeof window !== 'undefined') {
  (window as any).L = L;
}

export { L };
export default L;
