'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl';

const ARLINGTON_PLAZA = {
  latitude: 32.735377,
  longitude: -97.117832,
  address: '808 W Abram St, Arlington, TX 76013',
};

const explorerUrl = `https://www.sunsetpulse.app/explorer?lat=${ARLINGTON_PLAZA.latitude}&lng=${ARLINGTON_PLAZA.longitude}`;
const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ARLINGTON_PLAZA.address)}`;

export default function KcdGroupAreaMap() {
  const [showLocation, setShowLocation] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  return (
    <section className="bg-[#f5f1e8] px-5 py-16 sm:px-8 md:py-20 lg:px-12" aria-labelledby="kcd-area-map-title">
      <div className="mx-auto grid w-full max-w-7xl gap-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
        <div className="max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#94702f]">Around the property</p>
          <h2 id="kcd-area-map-title" className="mt-3 text-3xl tracking-[-0.025em] text-[#2a2116] sm:text-4xl">
            Find Arlington Plaza.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#706553]">
            Pan and zoom around 808 W Abram St, then open the Sunset Pulse Explorer to look across the wider area.
          </p>
          <Link
            href={explorerUrl}
            className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[#b49456] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[#5e471d] transition hover:bg-[#e8dcc2]"
          >
            Open in Explorer <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-[#ded2ba] bg-[#e8e1d4] shadow-[0_20px_60px_-42px_rgba(53,39,17,0.5)]">
          <div className="h-[330px] w-full sm:h-[390px]" role="region" aria-label="Interactive map around Arlington Plaza">
            {mapboxToken ? (
              <Map
                initialViewState={{
                  latitude: ARLINGTON_PLAZA.latitude,
                  longitude: ARLINGTON_PLAZA.longitude,
                  zoom: 14.5,
                }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={mapboxToken}
                attributionControl
              >
                <NavigationControl position="top-right" showCompass={false} />
                <Marker latitude={ARLINGTON_PLAZA.latitude} longitude={ARLINGTON_PLAZA.longitude} anchor="bottom">
                  <button
                    type="button"
                    onClick={() => setShowLocation(true)}
                    className="rounded-full border-2 border-white bg-[#372b1b] px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-[#5b4728] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#94702f]"
                    aria-label="Show Arlington Plaza address on map"
                  >
                    Arlington Plaza
                  </button>
                </Marker>
                {showLocation ? (
                  <Popup
                    latitude={ARLINGTON_PLAZA.latitude}
                    longitude={ARLINGTON_PLAZA.longitude}
                    anchor="top"
                    closeButton
                    closeOnClick={false}
                    onClose={() => setShowLocation(false)}
                    maxWidth="260px"
                  >
                    <div className="space-y-2 p-1 text-sm text-[#241d15]">
                      <p className="font-semibold">Arlington Plaza</p>
                      <p>{ARLINGTON_PLAZA.address}</p>
                      <a className="font-semibold text-[#755a25] underline" href={directionsUrl} target="_blank" rel="noreferrer">
                        Get directions
                      </a>
                    </div>
                  </Popup>
                ) : null}
              </Map>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-[#625747]">
                <h3 className="text-xl text-[#302519]">Arlington Plaza</h3>
                <p className="text-sm">The interactive map needs the Explorer map configuration.</p>
                <a className="text-sm font-semibold underline" href={directionsUrl} target="_blank" rel="noreferrer">
                  Open address in Google Maps
                </a>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ded2ba] bg-[#fcfaf5] px-4 py-3 text-xs text-[#706553] sm:px-5">
            <span>{ARLINGTON_PLAZA.address}</span>
            <span>Drag to pan · use controls to zoom</span>
          </div>
        </div>
      </div>
    </section>
  );
}
