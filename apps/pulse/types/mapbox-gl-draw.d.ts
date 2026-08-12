declare module '@mapbox/mapbox-gl-draw' {
  interface MapboxDrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      polygon?: boolean;
      trash?: boolean;
      [key: string]: boolean | undefined;
    };
    defaultMode?: string;
  }

  interface MapboxDrawFeatureCollection {
    features: Array<{
      geometry: { type: string; coordinates: unknown };
      [key: string]: unknown;
    }>;
  }

  export default class MapboxDraw {
    constructor(options?: MapboxDrawOptions);
    getAll(): MapboxDrawFeatureCollection;
  }
}

declare module '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions' {
  interface MapboxDirectionsOptions {
    accessToken?: string;
    unit?: 'imperial' | 'metric';
    profile?: string;
    interactive?: boolean;
    controls?: {
      inputs?: boolean;
      instructions?: boolean;
      profileSwitcher?: boolean;
    };
  }

  export default class MapboxDirections {
    constructor(options?: MapboxDirectionsOptions);
  }
}
