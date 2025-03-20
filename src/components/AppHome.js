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

// Styled Components
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
  position: "relative",
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

// Helper Functions
const formatFieldName = (field) => {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

const isHiddenField = (field) => {
  const hiddenFields = ['table_name'];
  return hiddenFields.includes(field.toLowerCase());
};

const detectColumnType = (key, value) => {
  const keyLower = key.toLowerCase();
  if (keyLower.includes('status')) return 'status';
  if (keyLower.includes('date') || keyLower.includes('time')) return 'date';
  if (keyLower.includes('id') && !keyLower.includes('guid')) return 'id';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'text';
};

const sortByDaysToExpiry = (data) => {
  if (!data || !Array.isArray(data)) return [];
  return [...data].sort((a, b) => {
    const daysA = a.days_to_expiry ?? Number.MAX_VALUE;
    const daysB = b.days_to_expiry ?? Number.MAX_VALUE;
    return daysA - daysB;
  });
};

const detectTableStructure = (data) => {
  if (!data || data.length === 0) return { schema: {}, columnOrder: [] };
  
  const schema = {};
  const firstItem = data[0];
  const columnOrder = Object.keys(firstItem).filter(key => !isHiddenField(key));
  
  data.forEach(item => {
    Object.entries(item).forEach(([key, value]) => {
      if (!isHiddenField(key)) {
        if (!schema[key]) {
          schema[key] = detectColumnType(key, value);
        }
      }
    });
  });
  
  return { schema, columnOrder };
};

const processTablesData = (data) => {
  const groupedData = data.reduce((acc, item) => {
    const tableName = item.table_name;
    if (!acc[tableName]) {
      acc[tableName] = {
        data: [],
        schema: null,
        columnOrder: [],
      };
    }
    acc[tableName].data.push(item);
    return acc;
  }, {});

  Object.keys(groupedData).forEach(tableName => {
    const { schema, columnOrder } = detectTableStructure(groupedData[tableName].data);
    groupedData[tableName].schema = schema;
    groupedData[tableName].columnOrder = columnOrder;
    
    // Only sort if it's the veeam-job-status table
    if (tableName === 'ssl_cert_check') {
      groupedData[tableName].data = sortByDaysToExpiry(groupedData[tableName].data);
    }
  });

  return groupedData;
};

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
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: "dark",
      primary: { main: "#036649" },
      secondary: { main: "#00a676" },
      background: { default: "#121212" },
      text: { primary: "#ffffff" },
    },
  });

  const renderCellContent = (key, value, type) => {
    if (value == null) return "";

    switch (type) {
      case 'status':
        return (
          <Chip
            label={value}
            color={getStatusColor(value)}
            style={{ fontWeight: "bold", color: "#ffffff" }}
          />
        );
      case 'date':
        try {
          const date = new Date(value);
          return date.toLocaleString();
        } catch {
          return value.toString();
        }
      case 'id':
        return <span style={{ fontFamily: 'monospace' }}>{value}</span>;
      case 'object':
        if (typeof value === 'object') {
          if (value.commonName || value.organizationName) {
            return value.commonName || value.organizationName || 'N/A';
          }
          return JSON.stringify(value);
        }
        return value.toString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "default";
    
    status = status.toString().toLowerCase();
    const errorStatuses = ['fail', 'failed', 'error', 'expired', 'critical'];
    const warningStatuses = ['warning', 'pending', 'in progress'];
    const successStatuses = ['success', 'pass', 'passed', 'valid', 'active'];

    if (errorStatuses.some(s => status.includes(s))) return "error";
    if (warningStatuses.some(s => status.includes(s))) return "warning";
    if (successStatuses.some(s => status.includes(s))) return "success";
    return "default";
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://o2merk3yse.execute-api.us-east-1.amazonaws.com/dev/data");
      const data = await response.json();
      const processedData = processTablesData(data);
      setTablesData(processedData);
      setFilteredData(processedData);
      checkForCriticalData(processedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setAlertMessage("Failed to fetch data. Please try again.");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!selectedTable) return;

    const tableData = tablesData[selectedTable]?.data || [];
    const filteredTableData = tableData.filter((item) =>
      Object.entries(item).some(([key, value]) => {
        if (isHiddenField(key)) return false;
        if (value == null) return false;
        return value.toString().toLowerCase().includes(searchText.toLowerCase());
      })
    );

    const processedData = selectedTable === 'veeam-job-status' 
      ? sortByDaysToExpiry(filteredTableData)
      : filteredTableData;

    setFilteredData({
      ...filteredData,
      [selectedTable]: {
        ...tablesData[selectedTable],
        data: processedData,
      },
    });
    setPage(0);
  };

  const checkForCriticalData = (data) => {
    let foundCriticalData = false;
    Object.values(data).forEach(table => {
      table.data.forEach(row => {
        Object.entries(row).forEach(([key, value]) => {
          if (typeof value === 'string' && key.toLowerCase().includes('status')) {
            const status = value.toLowerCase();
            if (status.includes('fail') || status.includes('error') || 
                status.includes('expired') || status.includes('critical')) {
              foundCriticalData = true;
            }
          }
        });
      });
    });

    if (foundCriticalData) {
      setAlertMessage("Critical alert: Issues found in the data!");
      setOpenSnackbar(true);
    }
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
    try {
      const dataToExport = tablesData[selectedTable].data.map(row => {
        const exportRow = {};
        Object.entries(row).forEach(([key, value]) => {
          if (!isHiddenField(key)) {
            exportRow[formatFieldName(key)] = typeof value === 'object' ? 
              JSON.stringify(value) : value;
          }
        });
        return exportRow;
      });

      const csvData = await json2csv(dataToExport);
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedTable}_${new Date().toISOString()}.csv`;
      link.click();
    } catch (error) {
      console.error("Error exporting CSV:", error);
      setAlertMessage("Failed to export data. Please try again.");
      setOpenSnackbar(true);
    }
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
  }, [searchText, selectedTable]);

  const getVisibleColumns = (tableData) => {
    if (!tableData?.schema || !tableData?.columnOrder) return [];
    
    return tableData.columnOrder
      .filter(key => !isHiddenField(key))
      .map(key => ({
        key,
        title: formatFieldName(key),
        type: tableData.schema[key]
      }));
  };

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
          flexDirection: "column",
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
          <div style={{ position: "absolute", right: 20, display: "flex", alignItems: "center" }}>
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
                  {formatFieldName(tableName)}
                </MenuItem>
              ))}
            </Select>
          </Tooltip>

          <Tooltip title="Search">
            <TextField
              placeholder="Search Table"
              variant="outlined"
              onChange={(e) => setSearchText(e.target.value)}
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
                  {selectedTable && getVisibleColumns(tablesData[selectedTable]).map((column) => (
                    <TableCell
                      key={column.key}
                      style={{
                        color: "#ffffff",
                        fontWeight: "bold",
                        padding: "8px",
                      }}
                    >
                      {column.title}
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
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = darkMode ? "#444444" : "#f1f1f1")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = darkMode ? "#333333" : "#ffffff")}
                    onClick={() => handleRowClick(row)}
                  >
                    {getVisibleColumns(tablesData[selectedTable]).map((column) => (
                      <TableCell
                        key={column.key}
                        style={{
                          padding: "8px",
                          maxWidth: "300px",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          color: darkMode ? "#ffffff" : "inherit",
                        }}
                      >
                        {renderCellContent(column.key, row[column.key], column.type)}
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

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            style: {
              backgroundColor: darkMode ? "#333333" : "#ffffff",
              color: darkMode ? "#ffffff" : "inherit",
            },
          }}
        >
          <DialogTitle>
            Row Details
            <IconButton
              onClick={handleCloseDialog}
              style={{
                position: "absolute",
                right: 10,
                top: 10,
                color: darkMode ? "#ffffff" : "inherit",
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedRow && getVisibleColumns(tablesData[selectedTable]).map((column) => (
              <Typography
                key={column.key}
                style={{
                  marginBottom: 10,
                  color: darkMode ? "#ffffff" : "inherit",
                }}
              >
                <strong>{column.title}:</strong>{' '}
                {renderCellContent(column.key, selectedRow[column.key], column.type)}
              </Typography>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} style={{ color: "#036649" }}>
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
            © 2024 Dave Dashboard
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