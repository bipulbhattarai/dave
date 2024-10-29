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
  Chip,
  LinearProgress,
  Switch,
  TablePagination,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import { json2csv } from "json-2-csv";
import '../src/App.css';

const App = () => {
  const [tablesData, setTablesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true); // New loading page state
  const [selectedTable, setSelectedTable] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [openAlertSnackbar, setOpenAlertSnackbar] = useState(false);
  const [previousData, setPreviousData] = useState(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // Simulate loading time for demonstration, then fetch data
    setTimeout(() => {
      fetchData();
      setLoadingPage(false); // Hide loading page once data is fetched
    }, 1500); // Adjust the time as needed
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
        checkCriticalData(groupedData);
        checkSignificantDataChange(groupedData);
        setPreviousData(groupedData);
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

  // Check for critical data (e.g., "Fail" statuses)
  const checkCriticalData = (data) => {
    const hasFailures = Object.values(data).some(table => 
      table.data.some(row => row.backup_status === "Fail")
    );
    if (hasFailures) {
      setAlertMessage("Critical Alert: Some records have 'Fail' status!");
      setOpenAlertSnackbar(true);
    }
  };

  // Check for significant data change (example: if the number of rows changes)
  const checkSignificantDataChange = (newData) => {
    if (!previousData) return;

    const previousCount = Object.values(previousData).reduce((acc, table) => acc + table.data.length, 0);
    const newCount = Object.values(newData).reduce((acc, table) => acc + table.data.length, 0);

    if (newCount !== previousCount) {
      setAlertMessage(`Significant Update: Data count has changed from ${previousCount} to ${newCount}`);
      setOpenAlertSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => setOpenSnackbar(false);
  const handleCloseAlertSnackbar = () => setOpenAlertSnackbar(false);
  const handleCloseDetails = () => setOpenDetails(false);

  // Dark and light theme configurations
  const lightTheme = createTheme({
    palette: {
      mode: "light",
      primary: { main: "#036649" },
      background: { default: "#ffffff" },
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#036649" },
      background: { default: "#121212" },
      text: { primary: "#ffffff" },
    },
  });

  const handleDarkModeToggle = () => setDarkMode(!darkMode);

  // Pagination handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => setRowsPerPage(parseInt(event.target.value, 10));

  // Export filtered data to CSV
  const exportToCSV = async () => {
    const csvData = await json2csv(filteredData);
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "filtered_data.csv";
    link.click();
  };

  // **Display Data in Table**
  const selectedTableData = tablesData[selectedTable]?.data || [];
  const filteredData = selectedTableData.filter((item) =>
    Object.values(item).some((val) =>
      val && val.toString().toLowerCase().includes(searchText)
    )
  );
  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Render loading page if loadingPage is true
  if (loadingPage) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#036649" }}>
        <Typography variant="h4" style={{ color: "#ffffff", marginBottom: 20 }}>
          Welcome to Dave Dashboard
        </Typography>
        <CircularProgress style={{ color: "#ffffff" }} />
      </div>
    );
  }

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <div style={{ padding: 20, minHeight: "100vh", backgroundColor: darkMode ? "#121212" : "#ffffff" }}>
        {/* Title and Dark Mode Toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Typography variant="h4" style={{ color: darkMode ? "#ffffff" : "#036649", textAlign: "center", flex: 1 }}>
            Dave - Dashboard
          </Typography>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Typography variant="body1" style={{ color: darkMode ? "#ffffff" : "#036649", marginRight: 8 }}>
              Dark Mode
            </Typography>
            <Switch checked={darkMode} onChange={handleDarkModeToggle} color="primary" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            backgroundColor: darkMode ? "#424242" : "#f5f5f5",
            padding: "10px",
            borderRadius: "8px",
          }}
        >
          <Select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            displayEmpty
            variant="outlined"
            style={{
              width: 200,
              backgroundColor: darkMode ? "#333333" : "#ffffff",
              color: darkMode ? "#ffffff" : "#036649",
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
            onChange={(e) => setSearchText(e.target.value.toLowerCase())}
            value={searchText}
            style={{
              width: 300,
              backgroundColor: darkMode ? "#333333" : "#ffffff",
            }}
            InputProps={{
              style: { color: darkMode ? "#ffffff" : "#036649" },
            }}
          />

          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchData} style={{ color: "#036649" }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export to CSV">
            <IconButton onClick={exportToCSV} style={{ color: "#036649" }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </div>

        {loading ? (
          <CircularProgress style={{ display: "block", margin: "20px auto", color: darkMode ? "#bb86fc" : "#036649" }} />
        ) : (
          <TableContainer component={Paper} style={{ borderRadius: "8px", backgroundColor: darkMode ? "#333333" : "#ffffff" }}>
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: darkMode ? "#333333" : "#036649" }}>
                  {tablesData[selectedTable]?.columns.map((col) => (
                    <TableCell key={col.key} style={{ color: darkMode ? "#ffffff" : "#ffffff", fontWeight: "bold" }}>
                      {col.title}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIndex) => (
                    <TableRow
                      key={rowIndex}
                      style={{
                        backgroundColor:
                          row.backup_status === "Fail" ? (darkMode ? "#432d2d" : "#fdecea") : (darkMode ? "#2d4d32" : "#e7f5e6"),
                        cursor: "pointer",
                        transition: "background-color 0.3s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = darkMode ? "#3d3d3d" : "#f0f0f0")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          row.backup_status === "Fail" ? (darkMode ? "#432d2d" : "#fdecea") : (darkMode ? "#2d4d32" : "#e7f5e6"))
                      }
                      onClick={() => setSelectedRow(row)}
                    >
                      {tablesData[selectedTable]?.columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.key === "backup_status" ? (
                            <Chip
                              label={row[col.key]}
                              color={row[col.key] === "Fail" ? "error" : "success"}
                              style={{ fontWeight: "bold", color: "#ffffff" }}
                            />
                          ) : (
                            row[col.key]
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tablesData[selectedTable]?.columns.length || 1} align="center">
                      <Alert severity="info">No matching data found</Alert>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              style={{ color: darkMode ? "#ffffff" : "#036649" }}
            />
          </TableContainer>
        )}

        {/* Snackbar for data refresh notification */}
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

        {/* Snackbar for critical and significant change alerts */}
        <Snackbar
          open={openAlertSnackbar}
          autoHideDuration={6000}
          onClose={handleCloseAlertSnackbar}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={handleCloseAlertSnackbar} severity="warning" variant="filled">
            {alertMessage}
          </Alert>
        </Snackbar>

        <Dialog open={openDetails} onClose={() => setOpenDetails(false)}>
          <DialogTitle>Row Details</DialogTitle>
          <DialogContent dividers>
            {selectedRow &&
              Object.entries(selectedRow).map(([key, value]) => (
                <Typography key={key}>
                  <strong>{key.replace(/_/g, " ")}:</strong> {value}
                </Typography>
              ))}
          </DialogContent>
          <Button onClick={() => setOpenDetails(false)} color="primary">
            Close
          </Button>
        </Dialog>
      </div>
    </ThemeProvider>
  );
};

export default App;
