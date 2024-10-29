import { useEffect, useState } from "react";
import {
  Typography,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
  Snackbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import '../src/App.css';

const App = () => {
  const [tablesData, setTablesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [searchText, setSearchText] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    fetch("https://o2merk3yse.execute-api.us-east-1.amazonaws.com/dev/data")
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        setOpenSnackbar(true);
        const groupedData = groupAndGenerateColumns(data);
        setTablesData(groupedData);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Couldn't fetch data", err);
      });
  };

  const groupAndGenerateColumns = (data) => {
    const groups = data.reduce((acc, item) => {
      const tableName = item.table_name;
      if (!acc[tableName]) {
        acc[tableName] = { data: [], keys: new Set() };
      }
      acc[tableName].data.push(item);
      Object.keys(item).forEach((key) => {
        if (key !== "table_name") acc[tableName].keys.add(key);
      });
      return acc;
    }, {});

    Object.keys(groups).forEach((tableName) => {
      groups[tableName].columns = Array.from(groups[tableName].keys).map(
        (key) => ({
          title: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          dataIndex: key,
          key: key,
        })
      );
    });

    return groups;
  };

  const handleTableChange = (event) => {
    setSelectedTable(event.target.value);
    setSearchText("");
  };

  const handleSearch = (event) => {
    setSearchText(event.target.value.toLowerCase());
  };

  const filteredData =
    selectedTable && tablesData[selectedTable]
      ? tablesData[selectedTable].data.filter((item) =>
          Object.values(item).some(
            (val) =>
              val &&
              val.toString().toLowerCase().includes(searchText)
          )
        )
      : [];

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setOpenDetails(true);
  };

  const handleCloseSnackbar = () => setOpenSnackbar(false);
  const handleCloseDetails = () => setOpenDetails(false);

  return (
    <div style={{ padding: 20, backgroundColor: "#ffffff", minHeight: "100vh" }}>
      <Typography
        variant="h4"
        align="center"
        style={{
          backgroundColor: "#036649",
          color: "#ffffff",
          padding: "15px 0",
          borderRadius: "8px",
          fontWeight: 600,
          marginBottom: "20px",
        }}
      >
        Dave - Dashboard
      </Typography>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "8px",
        }}
      >
        <Select
          value={selectedTable}
          onChange={handleTableChange}
          displayEmpty
          variant="outlined"
          style={{
            width: 200,
            backgroundColor: "#ffffff",
            color: "#036649",
            borderColor: "#036649",
          }}
        >
          <MenuItem value="" disabled>
            Select Module
          </MenuItem>
          {Object.keys(tablesData).map((tableName) => (
            <MenuItem key={tableName} value={tableName}>
              {tableName}
            </MenuItem>
          ))}
        </Select>

        <TextField
          placeholder="Search Table"
          variant="outlined"
          onChange={handleSearch}
          value={searchText}
          style={{
            width: 300,
            backgroundColor: "#ffffff",
            color: "#036649",
            borderColor: "#036649",
          }}
          InputProps={{
            style: { color: "#036649" },
          }}
        />

        <Tooltip title="Refresh Data">
          <IconButton onClick={fetchData} style={{ color: "#036649" }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </div>

      {loading ? (
        <CircularProgress style={{ display: "block", margin: "20px auto", color: "#036649" }} />
      ) : (
        selectedTable && tablesData[selectedTable] ? (
          <TableContainer component={Paper} style={{ borderRadius: "8px", backgroundColor: "#ffffff" }}>
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#036649" }}>
                  {tablesData[selectedTable].columns.map((col) => (
                    <TableCell key={col.key} style={{ color: "#ffffff", fontWeight: "bold" }}>
                      {col.title}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      style={{
                        backgroundColor:
                          row.backup_status === "Fail" ? "#fdecea" : "#e7f5e6",
                        cursor: "pointer",
                      }}
                      onClick={() => handleRowClick(row)}
                    >
                      {tablesData[selectedTable].columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.key === "backup_status" ? (
                            <span
                              className={
                                row.backup_status === "Fail"
                                  ? "backup-status-fail"
                                  : "backup-status-success"
                              }
                            >
                              {row[col.key]}
                            </span>
                          ) : (
                            row[col.key]
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tablesData[selectedTable].columns.length} align="center">
                      <Alert severity="info">No matching data found</Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography align="center" color="textSecondary">
            No Data
          </Typography>
        )
      )}

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message="Data refreshed successfully"
        action={
          <IconButton size="small" color="inherit" onClick={handleCloseSnackbar}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

      <Dialog open={openDetails} onClose={handleCloseDetails}>
        <DialogTitle>Row Details</DialogTitle>
        <DialogContent dividers>
          {selectedRow &&
            Object.entries(selectedRow).map(([key, value]) => (
              <Typography key={key}>
                <strong>{key.replace(/_/g, " ")}:</strong> {value}
              </Typography>
            ))}
        </DialogContent>
        <Button onClick={handleCloseDetails} color="primary">
          Close
        </Button>
      </Dialog>
    </div>
  );
};

export default App;
