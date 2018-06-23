import Sitcom from './core/Sitcom';

function sitcom (silent: boolean = false) {
  return new Sitcom(silent);
}

(sitcom as any).Sitcom = Sitcom;

export default sitcom;
