import React, { useEffect, useState } from 'react';
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
  IconButton,
  Chip,
  Switch,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { json2csv } from 'json-2-csv';
import '@fontsource/poppins';

const DashboardContainer = styled("div")(({ theme }) => ({
  padding: 9,
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
  padding: "15px 0",
  backgroundColor: "#036649",
  borderRadius: "8px",
  color: "#ffffff",
});

const Logo = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontWeight: "bold",
  fontSize: "1.2rem",
});

const LogoIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2" fill="#ffffff" />
    <text x="12" y="16" textAnchor="middle" fill="#036649" fontSize="10px" fontWeight="bold">DD</text>
  </svg>
);

const FooterContainer = styled("footer")({
  backgroundColor: "#036649",
  color: "#ffffff",
  padding: "15px",
  textAlign: "center",
  marginTop: "20px",
  fontSize: "0.9rem",
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
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "1.5rem",
  fontFamily: "Poppins, sans-serif",
}));

const App = () => {
  const [tablesData, setTablesData] = useState({});
  const [filteredData, setFilteredData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [selectedTable, setSelectedTable] = useState("");
  const [searchText, setSearchText] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
const fetchData = () => {
    setLoading(true);
    fetch("https://o2merk3yse.execute-api.us-east-1.amazonaws.com/dev/data")
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        const groupedData = groupAndGenerateColumns(data);
        setTablesData(groupedData);
        setFilteredData(groupedData);
        checkForCriticalData(groupedData);
      })
      .catch((err) => {
        setLoading(false);
        console.error("Couldn't fetch data", err);
      });
  };

  const groupAndGenerateColumns = (data) => {
    const groups = data.reduce((acc, item) => {
      const tableName = item.table_name || getDetermineTableType(item);
      if (!acc[tableName]) {
        acc[tableName] = { data: [], keys: new Set() };
      }
      
      const { table_name, ...itemWithoutTableName } = item;
      acc[tableName].data.push(itemWithoutTableName);
      
      Object.keys(itemWithoutTableName).forEach((key) => {
        acc[tableName].keys.add(key);
      });
      return acc;
    }, {});

    const columnConfigs = {
      backup_status: {
        order: ['hostname', 'backup_status', 'last_backup_date', 'next_backup_date'],
        titles: {
          hostname: 'Hostname',
          backup_status: 'Backup Status',
          last_backup_date: 'Last Backup Date',
          next_backup_date: 'Next Backup Date'
        }
      },
      ssl_status: {
        order: ['domain', 'certificate_issued', 'certificate_expiry', 'days_to_expiry', 'status', 'check_date'],
        titles: {
          domain: 'Domain',
          certificate_issued: 'Certificate Issued',
          certificate_expiry: 'Certificate Expiry',
          days_to_expiry: 'Days to Expiry',
          status: 'Status',
          check_date: 'Last Check Date'
        }
      }
    };

    Object.keys(groups).forEach((tableName) => {
      const config = columnConfigs[tableName];
      if (config) {
        groups[tableName].columns = config.order
          .filter(key => groups[tableName].keys.has(key))
          .map(key => ({
            title: config.titles[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            dataIndex: key,
            key: key
          }));
      } else {
        groups[tableName].columns = Array.from(groups[tableName].keys).map(key => ({
          title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          dataIndex: key,
          key: key
        }));
      }
    });

    return groups;
  };

  const getDetermineTableType = (item) => {
    if (item.hasOwnProperty('backup_status')) {
      return 'backup_status';
    }
    if (item.hasOwnProperty('certificate_expiry') || item.hasOwnProperty('days_to_expiry')) {
      return 'ssl_status';
    }
    return 'unknown';
  };

  const checkForCriticalData = (data) => {
    let foundCriticalData = false;
    Object.keys(data).forEach((tableName) => {
      data[tableName].data.forEach((row) => {
        if (row.backup_status === "Fail" || row.status === "expired") {
          foundCriticalData = true;
        }
      });
    });

    if (foundCriticalData) {
      setAlertMessage("Critical alert: Failed backups or expired certificates found!");
      setOpenSnackbar(true);
    }
  };

  const handleSearch = () => {
    if (!selectedTable) return;

    const tableData = tablesData[selectedTable]?.data || [];
    const filteredTableData = tableData.filter((item) =>
      Object.values(item).some((value) =>
        value && value.toString().toLowerCase().includes(searchText.toLowerCase())
      )
    );

    setFilteredData({
      ...filteredData,
      [selectedTable]: { ...tablesData[selectedTable], data: filteredTableData },
    });
    setPage(0);
  };

  const handleDarkModeToggle = () => setDarkMode(!darkMode);
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRowClick = (row) => {
    setSelectedRow(row);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedRow(null);
  };

  const handleSnackbarClose = () => setOpenSnackbar(false);

  const exportToCSV = async () => {
    if (!selectedTable || !tablesData[selectedTable]) return;
    
    const csvData = await json2csv(tablesData[selectedTable].data || []);
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedTable}_data.csv`;
    link.click();
  };

  useEffect(() => {
    setTimeout(() => {
      fetchData();
      setLoadingPage(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (selectedTable) {
      handleSearch();
    }
  }, [searchText, selectedTable, tablesData]);

  const paginatedData = selectedTable
    ? (filteredData[selectedTable]?.data || []).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      )
    : [];

  if (loadingPage) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#036649",
        }}
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
          <Logo>
            <LogoIcon />
            <Title variant="h5">Dave - Dashboard</Title>
          </Logo>
          <div style={{ position: "absolute", right: 0, display: "flex", alignItems: "center" }}>
            <Typography variant="body2" style={{ color: "#ffffff", marginRight: 8, fontSize: "0.85rem" }}>
              Dark Mode
            </Typography>
            <Switch
              checked={darkMode}
              onChange={handleDarkModeToggle}
              color="default"
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
                  {tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
          <CircularProgress
            style={{
              display: "block",
              margin: "20px auto",
              color: darkMode ? "#bb86fc" : "#036649",
            }}
          />
        ) : (
          <TableContainer
            component={Paper}
            style={{
              borderRadius: "8px",
              backgroundColor: darkMode ? "#333333" : "#ffffff",
              boxShadow: darkMode
                ? "0px 4px 8px rgba(0, 0, 0, 0.3)"
                : "0px 4px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#036649" }}>
                  {selectedTable && tablesData[selectedTable]?.columns.map((col) => (
                    <TableCell
                      key={col.key}
                      style={{
                        color: "#ffffff",
                        fontWeight: "bold",
                        padding: "8px",
                      }}
                    >
                      {col.title}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    component={motion.tr}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      backgroundColor: darkMode ? "#333333" : "#ffffff",
                      cursor: "pointer",
                      transition: "background-color 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = darkMode ? "#444444" : "#f1f1f1")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = darkMode ? "#333333" : "#ffffff")}
                    onClick={() => handleRowClick(row)}
                  >
                    {tablesData[selectedTable]?.columns.map((col) => (
                      <TableCell
                        key={col.key}
                        style={{
                          padding: "8px",
                          maxWidth: "300px",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        {col.key === "backup_status" || col.key === "status" ? (
                          <Chip
                            label={row[col.key]}
                            color={row[col.key] === "Fail" || row[col.key] === "expired" ? "error" : "success"}
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
              count={(filteredData[selectedTable]?.data || []).length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              style={{ color: darkMode ? "#ffffff" : "#036649" }}
            />
          </TableContainer>
        )}

        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle>
            Row Details
            <IconButton 
              onClick={handleCloseDialog} 
              style={{ position: "absolute", right: 10, top: 10 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedRow &&
              Object.entries(selectedRow).map(([key, value]) => (
                <Typography key={key} style={{ marginBottom: 10 }}>
                  <strong>{key.replace(/_/g, " ")}:</strong> {value}
                </Typography>
              ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={5000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: "100%" }}>
            {alertMessage}
          </Alert>
        </Snackbar>

        <FooterContainer>
          <Typography variant="body2">
            © 2024 Dave Dashboard | Streamlined Data Insights
          </Typography>
          <Typography variant="body2" style={{ fontSize: "0.8rem" }}>
            Built by IT Team
          </Typography>
        </FooterContainer>
      </DashboardContainer>
    </ThemeProvider>
  );
};

export default App;
