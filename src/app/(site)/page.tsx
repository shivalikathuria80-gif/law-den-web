import { PREVIEW_MODE } from '../../lib/preview';
import { Landing } from '../../views/Landing';
import { PreviewApp } from '../../views/PreviewApp';

export default function LandingPage() {
  return PREVIEW_MODE ? <PreviewApp /> : <Landing />;
}
