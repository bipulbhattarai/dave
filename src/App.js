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
  Switch,
  TablePagination,
} from "@mui/material";
import { createTheme, ThemeProvider, styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import { json2csv } from "json-2-csv";
import "../src/App.css";
import "@fontsource/poppins"; // Import Google Font 'Poppins'

// Define custom styled components with MUI's styled utility
const DashboardContainer = styled("div")(({ theme }) => ({
  padding: 20,
  minHeight: "100vh",
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontFamily: "Poppins, sans-serif",
}));

const TitleContainer = styled("div")({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 20,
  position: "relative",
});

const ControlsContainer = styled("div")(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  backgroundColor: theme.palette.mode === "dark" ? "#333" : "#f7f7f7",
  padding: "10px",
  borderRadius: "8px",
  boxShadow: theme.shadows[3],
}));

const EnhancedButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  "&:hover": {
    color: theme.palette.secondary.main,
    transform: "scale(1.1)",
  },
}));

const Title = styled(Typography)(({ theme }) => ({
  backgroundColor: "#036649",
  color: "#ffffff",
  padding: "12px 0",
  borderRadius: "8px",
  fontWeight: "bold",
  textAlign: "center",
  width: "100%",
  fontFamily: "Poppins, sans-serif",
}));

const App = () => {
  const [tablesData, setTablesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [selectedTable, setSelectedTable] = useState("");
  const [searchText, setSearchText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [openAlertSnackbar, setOpenAlertSnackbar] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setTimeout(() => {
      fetchData();
      setLoadingPage(false);
    }, 1500);
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

  const handleCloseSnackbar = () => setOpenSnackbar(false);
  const handleCloseAlertSnackbar = () => setOpenAlertSnackbar(false);
  const handleCloseDetails = () => setOpenDetails(false);

  const lightTheme = createTheme({
    palette: {
      mode: "light",
      primary: { main: "#036649" },
      secondary: { main: "#00a676" },
      background: { default: "#f3f3f3" },
      fontFamily: "Poppins, sans-serif",
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#036649" },
      secondary: { main: "#00a676" },
      background: { default: "#121212" },
      text: { primary: "#ffffff" },
      fontFamily: "Poppins, sans-serif",
    },
  });

  const handleDarkModeToggle = () => setDarkMode(!darkMode);

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => setRowsPerPage(parseInt(event.target.value, 10));

  const exportToCSV = async () => {
    const csvData = await json2csv(tablesData[selectedTable]?.data || []);
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "filtered_data.csv";
    link.click();
  };

  if (loadingPage) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#036649" }}
      >
        <Typography variant="h4" style={{ color: "#ffffff", marginBottom: 20 }}>
          Welcome to Dave Dashboard
        </Typography>
        <CircularProgress style={{ color: "#ffffff" }} />
      </motion.div>
    );
  }

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <DashboardContainer>
        <TitleContainer>
          <Title variant="h4">Dave - Dashboard</Title>
          <div style={{ position: "absolute", right: 0 }}>
            <Typography variant="body1" style={{ color: "#ffffff", marginRight: 8 }}>
              Dark Mode
            </Typography>
            <Switch
              checked={darkMode}
              onChange={handleDarkModeToggle}
              color="default" // Set toggle switch to white in dark mode
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": {
                  color: "#ffffff",
                },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                  backgroundColor: "#ffffff",
                },
              }}
            />
          </div>
        </TitleContainer>

        <ControlsContainer>
          <Tooltip title="Select Module">
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
          </Tooltip>

          <Tooltip title="Search">
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
                startAdornment: (
                  <IconButton>
                    <SearchIcon style={{ color: darkMode ? "#ffffff" : "#036649" }} />
                  </IconButton>
                ),
                style: { color: darkMode ? "#ffffff" : "#036649" },
              }}
            />
          </Tooltip>

          <Tooltip title="Refresh Data">
            <EnhancedButton onClick={fetchData}>
              <RefreshIcon />
            </EnhancedButton>
          </Tooltip>

          <Tooltip title="Export to CSV">
            <EnhancedButton onClick={exportToCSV}>
              <DownloadIcon />
            </EnhancedButton>
          </Tooltip>
        </ControlsContainer>

        {loading ? (
          <CircularProgress style={{ display: "block", margin: "20px auto", color: darkMode ? "#bb86fc" : "#036649" }} />
        ) : (
          <TableContainer component={Paper} style={{ borderRadius: "8px", backgroundColor: darkMode ? "#333333" : "#ffffff", boxShadow: darkMode ? "0px 4px 8px rgba(0, 0, 0, 0.3)" : "0px 4px 8px rgba(0, 0, 0, 0.1)" }}>
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
                {(tablesData[selectedTable]?.data || []).map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    component={motion.tr}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      backgroundColor: darkMode ? "#333333" : "#ffffff",
                      cursor: "pointer",
                    }}
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
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={(tablesData[selectedTable]?.data || []).length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              style={{ color: darkMode ? "#ffffff" : "#036649" }}
            />
          </TableContainer>
        )}
      </DashboardContainer>
    </ThemeProvider>
  );
};

export default App;
