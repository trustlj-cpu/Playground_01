// React hook over webScale.ts (see there for the scaling rule).
import { useTV } from './scale';
import { webScale, type Web } from './webScale';

export { WEB_SHEET, WEB_VW, webScale, type Web } from './webScale';

export function useWeb(): Web {
  const { W, H } = useTV();
  return { ...webScale(W, H), W, H };
}
