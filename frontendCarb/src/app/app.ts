import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, HostListener, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { Subscription } from 'rxjs';

interface StationPrices {
  gazole: number | null;
  sp95: number | null;
  e10: number | null;
  sp98: number | null;
  e85: number | null;
  gplc: number | null;
}

interface StationUpdateDates {
  gazole: string | null;
  sp95: string | null;
  e10: string | null;
  sp98: string | null;
  e85: string | null;
  gplc: string | null;
}

interface Station {
  id: number;
  latitude: number;
  longitude: number;
  adresse: string | null;
  ville: string | null;
  prix: StationPrices;
  datesMiseAJour: StationUpdateDates;
}

type FuelFilter = keyof StationPrices | 'all';

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit, OnDestroy {
  stations: Station[] = [];
  filteredStations: Station[] = [];
  displayedStations: Station[] = [];
  selectedStation: Station | null = null;
  searchTerm = '';
  filterVille = '';
  selectedFuel: FuelFilter = 'all';
  maxPrice = '';
  isLoading = false;
  errorMessage = '';

  private map: L.Map | null = null;
  private markersLayer = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    iconCreateFunction: (cluster) => this.createClusterIcon(cluster.getChildCount())
  });
  private markersById = new Map<number, L.Marker>();
  private normalizedSearchById = new Map<number, string>();
  private minPriceById = new Map<number, number | null>();
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxDisplayedStations = 350;
  private dataSubscription?: Subscription;
  private readonly apiBaseUrl = 'http://localhost:5000';
  private readonly mauritaniaCenter: L.LatLngExpression = [20.25, -10.6];
  private readonly mauritaniaBounds = L.latLngBounds(
    [14.0, -18.5],
    [27.5, -4.0]
  );

  constructor(private readonly http: HttpClient) {}

  ngAfterViewInit(): void {
    this.initializeMap();
    this.loadStations();
  }

  ngOnDestroy(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.map?.invalidateSize();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;
    this.scheduleFilterApply();
  }

  onFilterVilleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterVille = input.value;
    this.scheduleFilterApply();
  }

  onFuelChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedFuel = select.value as FuelFilter;
    this.scheduleFilterApply();
  }

  onMaxPriceInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.maxPrice = input.value;
    this.scheduleFilterApply();
  }

  selectStation(station: Station): void {
    this.selectedStation = station;
    const marker = this.markersById.get(station.id);
    if (marker && this.map) {
      this.map.setView(marker.getLatLng(), 12, { animate: true });
      marker.openPopup();
    }
  }

  getPriceEntries(station: Station): Array<{ key: string; value: number }> {
    const entries: Array<{ key: string; value: number }> = [];
    for (const [key, value] of Object.entries(station.prix)) {
      if (typeof value === 'number') {
        entries.push({ key: key.toUpperCase(), value });
      }
    }
    return entries;
  }

  getLatestDate(station: Station): string {
    const validDates = Object.values(station.datesMiseAJour).filter((date): date is string => !!date);
    if (!validDates.length) {
      return 'Non disponible';
    }
    const latest = validDates.sort().at(-1);
    return latest ?? 'Non disponible';
  }

  trackByStationId(_index: number, station: Station): number {
    return station.id;
  }

  private initializeMap(): void {
    this.map = L.map('stations-map', {
      zoomControl: true,
      preferCanvas: true
    }).setView(this.mauritaniaCenter, 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
    this.map.setMaxBounds(this.mauritaniaBounds);
    this.markersLayer.addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private loadStations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.dataSubscription = this.http.get<Station[]>(`${this.apiBaseUrl}/stations`).subscribe({
      next: (stations) => {
        this.stations = stations
          .map((station) => this.normalizeStationCoordinates(station))
          .filter((station) => this.hasValidCoordinates(station));
        this.filteredStations = this.stations;
        this.prepareStationIndexesAndMarkers();
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les stations. Verifie le backend.';
        this.isLoading = false;
      }
    });
  }

  private applyFilter(): void {
    const term = this.normalizeText(this.searchTerm.trim());
    const villeTerm = this.normalizeText(this.filterVille.trim());
    const max = Number.parseFloat(this.maxPrice);
    const hasMaxPrice = Number.isFinite(max);

    let list = this.stations;

    if (term) {
      list = list.filter((station) => {
        const haystack = this.normalizedSearchById.get(station.id) ?? '';
        return haystack.includes(term);
      });
    }

    if (villeTerm) {
      list = list.filter((station) =>
        this.normalizeText(station.ville ?? '').includes(villeTerm)
      );
    }

    if (this.selectedFuel !== 'all') {
      const selectedFuel = this.selectedFuel as keyof StationPrices;
      list = list.filter((station) => {
        const v = station.prix[selectedFuel];
        if (v === null || v === undefined) {
          return false;
        }
        if (hasMaxPrice && v > max) {
          return false;
        }
        return true;
      });
    } else if (hasMaxPrice) {
      list = list.filter((station) => {
        const stationMin = this.minPriceById.get(station.id);
        return stationMin !== null && stationMin !== undefined && stationMin <= max;
      });
    }

    this.filteredStations = list;
    this.displayedStations = this.filteredStations.slice(0, this.maxDisplayedStations);
    this.renderMarkers(this.filteredStations);
    this.updateMapViewport();
  }

  private renderMarkers(stations: Station[]): void {
    this.markersLayer.clearLayers();
    for (const station of stations) {
      const marker = this.markersById.get(station.id);
      if (marker) {
        this.markersLayer.addLayer(marker);
      }
    }
  }

  private updateMapViewport(): void {
    if (!this.map) {
      return;
    }
    if (!this.filteredStations.length) {
      this.map.setView(this.mauritaniaCenter, 6);
      return;
    }
    const bounds = L.latLngBounds(
      this.filteredStations.map((station) => [station.latitude, station.longitude] as [number, number])
    );
    this.map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
    this.map.invalidateSize();
  }

  private buildPopupContent(station: Station): string {
    const prices = this.getPriceEntries(station)
      .map((entry) => `<li><strong>${entry.key}:</strong> ${entry.value.toFixed(3)} MRU</li>`)
      .join('');

    const address = station.adresse ?? 'Adresse non disponible';
    const city = station.ville ?? 'Ville non disponible';

    return `
      <div>
        <h4>Station ${station.id}</h4>
        <p><strong>Ville:</strong> ${city}</p>
        <p><strong>Adresse:</strong> ${address}</p>
        <p><strong>Derniere mise a jour:</strong> ${this.getLatestDate(station)}</p>
        <ul>${prices || '<li>Prix non disponibles</li>'}</ul>
      </div>
    `;
  }

  private hasValidCoordinates(station: Station): boolean {
    if (!Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) {
      return false;
    }
    return this.mauritaniaBounds.contains(
      L.latLng(station.latitude, station.longitude)
    );
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private normalizeStationCoordinates(station: Station): Station {
    const latitude = this.normalizeCoordinateValue(station.latitude, 90);
    const longitude = this.normalizeCoordinateValue(station.longitude, 180);
    return { ...station, latitude, longitude };
  }

  private normalizeCoordinateValue(value: number, maxAbs: number): number {
    if (!Number.isFinite(value)) {
      return value;
    }
    if (Math.abs(value) <= maxAbs) {
      return value;
    }

    // Certaines lignes CSV stockent les coordonnees sans separateur decimal.
    const divisors = [100000, 10000, 1000];
    for (const divisor of divisors) {
      const candidate = value / divisor;
      if (Math.abs(candidate) <= maxAbs) {
        return candidate;
      }
    }
    return value;
  }

  private createFuelStationIcon(): L.DivIcon {
    return L.divIcon({
      className: 'fuel-station-marker',
      html: `
        <div class="fuel-station-marker__pin">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h9a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2Zm1 3v4h7V6H7Zm10.5-2.7 1.9 1.9a1 1 0 0 1 .3.7v5.6a2.5 2.5 0 0 1-5 0V9h2v2.5a.5.5 0 1 0 1 0V6.3l-1.6-1.6 1.4-1.4Z"/>
          </svg>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  private createClusterIcon(count: number): L.DivIcon {
    return L.divIcon({
      className: 'station-cluster-icon',
      html: `<div>${count}</div>`,
      iconSize: [36, 36]
    });
  }

  private scheduleFilterApply(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }
    this.filterDebounceTimer = setTimeout(() => {
      this.applyFilter();
    }, 220);
  }

  private prepareStationIndexesAndMarkers(): void {
    this.markersById.clear();
    this.normalizedSearchById.clear();
    this.minPriceById.clear();
    const fuelIcon = this.createFuelStationIcon();

    for (const station of this.stations) {
      const marker = L.marker([station.latitude, station.longitude], {
        icon: fuelIcon,
        keyboard: false
      });
      marker.bindPopup(this.buildPopupContent(station));
      marker.on('click', () => {
        this.selectedStation = station;
      });
      this.markersById.set(station.id, marker);

      const haystack = this.normalizeText(
        `${station.id} ${station.ville ?? ''} ${station.adresse ?? ''}`
      );
      this.normalizedSearchById.set(station.id, haystack);

      const prices = Object.values(station.prix).filter((x): x is number => typeof x === 'number');
      this.minPriceById.set(station.id, prices.length ? Math.min(...prices) : null);
    }
  }
}
