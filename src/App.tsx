import React, { useState, useEffect } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Paginator } from "primereact/paginator";
import { ProgressSpinner } from "primereact/progressspinner";
import { Message } from "primereact/message";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import axios from "axios";
import "./App.css";

interface Artwork {
  id: number;
  serialNumber: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

interface ApiResponse {
  data: Artwork[];
  pagination: {
    total: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
}

const App: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtworks, setSelectedArtworks] = useState<Artwork[]>([]);
  const [selectionMap, setSelectionMap] = useState<Map<number, boolean>>(
    new Map()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [bulkSelectCount, setBulkSelectCount] = useState<string>("");
  const overlayPanelRef = React.useRef<OverlayPanel>(null);
  const rowsPerPage = 10;

  const fetchArtworks = async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<ApiResponse>(
        ` https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rowsPerPage}`
      );

      // Extract only the necessary fields from each artwork and add serial numbers
      const filteredArtworks = response.data.data.map((artwork, index) => ({
        id: artwork.id,
        serialNumber: (page - 1) * rowsPerPage + index + 1,
        title: artwork.title,
        place_of_origin: artwork.place_of_origin,
        artist_display: artwork.artist_display,
        inscriptions: artwork.inscriptions,
        date_start: artwork.date_start,
        date_end: artwork.date_end,
      }));

      setArtworks(filteredArtworks);
      setTotalRecords(response.data.pagination.total);

      // Restore selections for current page from the map
      const currentPageSelections = filteredArtworks.filter(
        (artwork) => selectionMap.get(artwork.serialNumber) === true
      );
      setSelectedArtworks(currentPageSelections);
    } catch (err) {
      setError("Failed to fetch artworks. Please try again later.");
      console.error("Error fetching artworks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks(currentPage);
  }, [currentPage]);

  const onPageChange = (event: { page: number }) => {
    setCurrentPage(event.page + 1);
  };

  const titleTemplate = (rowData: Artwork) => {
    return (
      <div className="title-cell">
        <strong>{rowData.title || "Untitled"}</strong>
      </div>
    );
  };

  const artistTemplate = (rowData: Artwork) => {
    return (
      <div className="artist-cell">
        {rowData.artist_display || "Unknown Artist"}
      </div>
    );
  };

  const dateTemplate = (rowData: Artwork) => {
    const startDate = rowData.date_start;
    const endDate = rowData.date_end;

    if (startDate && endDate) {
      return `${startDate} - ${endDate}`;
    } else if (startDate) {
      return startDate.toString();
    } else {
      return "Unknown";
    }
  };

  const inscriptionsTemplate = (rowData: Artwork) => {
    return (
      <div className="inscriptions-cell">
        {rowData.inscriptions || "No inscriptions"}
      </div>
    );
  };

  const handleBulkSelect = () => {
    const count = parseInt(bulkSelectCount);
    if (!count || count <= 0) return;

    const newSelectionMap = new Map(selectionMap);
    const startSerial = (currentPage - 1) * rowsPerPage + 1;
    const endSerial = startSerial + count - 1;

    // Select the next N rows starting from current page
    for (let i = startSerial; i <= endSerial; i++) {
      newSelectionMap.set(i, true);
    }

    setSelectionMap(newSelectionMap);

    // Update current page selections.
    const currentPageSelections = artworks.filter(
      (artwork) => newSelectionMap.get(artwork.serialNumber) === true
    );
    setSelectedArtworks(currentPageSelections);

    overlayPanelRef.current?.hide();
    setBulkSelectCount("");
  };

  const selectionHeaderTemplate = () => {
    return (
      <div className="selection-header">
        <Button
          icon="pi pi-plus"
          className="p-button-sm p-button-text"
          onClick={(e) => overlayPanelRef.current?.toggle(e)}
          tooltip="Bulk Select"
          tooltipOptions={{ position: "bottom" }}
        />
      </div>
    );
  };

  if (loading && artworks.length === 0) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1>Art Institute Collection</h1>
          <p>Explore the vast collection of artworks</p>
        </div>
        <div className="loading-container">
          <ProgressSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="app-header">
          <h1>Art Institute Collection</h1>
          <p>Explore the vast collection of artworks</p>
        </div>
        <div className="error-container">
          <Message severity="error" text={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>Art Institute Collection</h1>
        <p>Explore the vast collection of artworks</p>
      </div>

      <DataTable
        value={artworks}
        selection={selectedArtworks}
        onSelectionChange={(e) => {
          console.log("Selection changed:", e.value);
          const newSelections = e.value as Artwork[];
          setSelectedArtworks(newSelections);

          // Update the selection map efficiently
          const newSelectionMap = new Map(selectionMap);

          // First, remove all current page selections from the map
          artworks.forEach((artwork) => {
            newSelectionMap.delete(artwork.serialNumber);
          });

          // Then, add only the currently selected items
          newSelections.forEach((artwork) => {
            newSelectionMap.set(artwork.serialNumber, true);
          });

          setSelectionMap(newSelectionMap);
          console.log("Selection Map:", Array.from(newSelectionMap.entries()));
        }}
        dataKey="id"
        loading={loading}
        className="artworks-table"
        selectionMode="multiple"
      >
        <Column
          selectionMode="multiple"
          headerStyle={{ width: "3rem" }}
          header={selectionHeaderTemplate}
        />
        <Column
          field="title"
          header="Title"
          body={titleTemplate}
          style={{ minWidth: "200px" }}
        />
        <Column
          field="artist_display"
          header="Artist"
          body={artistTemplate}
          style={{ minWidth: "150px" }}
        />
        <Column
          field="place_of_origin"
          header="Origin"
          style={{ minWidth: "120px" }}
        />
        <Column
          field="date_start"
          header="Date"
          body={dateTemplate}
          style={{ minWidth: "100px" }}
        />
        <Column
          field="inscriptions"
          header="Inscriptions"
          body={inscriptionsTemplate}
          style={{ minWidth: "200px" }}
        />
      </DataTable>

      <Paginator
        first={(currentPage - 1) * rowsPerPage}
        rows={rowsPerPage}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
      />

      <OverlayPanel ref={overlayPanelRef} className="bulk-select-overlay">
        <div className="bulk-select-content">
          <InputText
            value={bulkSelectCount}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow positive numbers
              if (value === "" || /^\d+$/.test(value)) {
                setBulkSelectCount(value);
              }
            }}
            placeholder="Select rows..."
            className="bulk-select-input"
            type="text"
            inputMode="numeric"
          />
          <Button
            label="Submit"
            onClick={handleBulkSelect}
            disabled={!bulkSelectCount || parseInt(bulkSelectCount) <= 0}
            className="bulk-select-button"
          />
        </div>
      </OverlayPanel>
    </div>
  );
};

export default App;
