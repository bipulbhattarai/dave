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
  Alert,
  Box,
} from '@mui/material';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { json2csv } from 'json-2-csv';
import '@fontsource/poppins';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ---------------- STYLED COMPONENTS ----------------
const DashboardContainer = styled('div')(({ theme }) => ({
  padding: 9,
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontFamily: 'Poppins, sans-serif',
}));

const TitleContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 20,
  padding: '15px 0',
  backgroundColor: '#036649',
  borderRadius: '8px',
  color: '#ffffff',
  position: 'relative',
});

const Logo = styled('div')({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontWeight: 'bold',
  fontSize: '1.2rem',
});

const LogoIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2" fill="#ffffff" />
    <text x="12" y="16" textAnchor="middle" fill="#036649" fontSize="10px" fontWeight="bold">
      DD
    </text>
  </svg>
);

const FooterContainer = styled('footer')({
  backgroundColor: '#036649',
  color: '#ffffff',
  padding: '15px',
  textAlign: 'center',
  marginTop: '20px',
  fontSize: '0.9rem',
});

const ControlsContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f7f7f7',
  padding: '10px',
  borderRadius: '8px',
  boxShadow: theme.shadows[3],
}));

const EnhancedButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.primary.main,
  '&:hover': {
    color: theme.palette.secondary.main,
    transform: 'scale(1.1)',
  },
}));

const Title = styled(Typography)(({ theme }) => ({
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '1.5rem',
  fontFamily: 'Poppins, sans-serif',
}));

// ---------------- HELPER FUNCTIONS ----------------

const isHiddenField = (field) => {
  const hiddenFields = ['table_name'];
  return hiddenFields.includes(field.toLowerCase());
};

const formatFieldName = (field) =>
  field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();

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

const detectTableStructure = (data) => {
  if (!data || data.length === 0) return { schema: {}, columnOrder: [] };

  const schema = {};
  const columnOrder = Object.keys(data[0]).filter((key) => !isHiddenField(key));

  data.forEach((row) => {
    Object.entries(row).forEach(([k, v]) => {
      if (!isHiddenField(k) && schema[k] == null) {
        schema[k] = detectColumnType(k, v);
      }
    });
  });

  return { schema, columnOrder };
};

const processTablesData = (data) => {
  const grouped = data.reduce((acc, item) => {
    const tName = item.table_name || 'AthenaTable';
    if (!acc[tName]) {
      acc[tName] = { data: [], schema: null, columnOrder: [] };
    }
    acc[tName].data.push(item);
    return acc;
  }, {});

  Object.keys(grouped).forEach((tableName) => {
    const { schema, columnOrder } = detectTableStructure(grouped[tableName].data);
    grouped[tableName].schema = schema;
    grouped[tableName].columnOrder = columnOrder;
  });

  return grouped;
};

const getStatusColor = (status) => {
  if (!status) return 'default';

  status = status.toString().toLowerCase();
  const errorStatuses = ['fail', 'failed', 'error', 'expired', 'critical'];
  const warningStatuses = ['warning', 'pending', 'in progress'];
  const successStatuses = ['success', 'pass', 'passed', 'valid', 'active'];

  if (errorStatuses.some((s) => status.includes(s))) return 'error';
  if (warningStatuses.some((s) => status.includes(s))) return 'warning';
  if (successStatuses.some((s) => status.includes(s))) return 'success';
  return 'default';
};

const renderCellContent = (key, value, type) => {
  if (value == null) return '';

  switch (type) {
    case 'status':
      return (
        <Chip
          label={value}
          color={getStatusColor(value)}
          style={{ fontWeight: 'bold', color: '#ffffff' }}
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
      return typeof value === 'object' ? JSON.stringify(value) : value.toString();
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      return value.toLocaleString();
    default:
      return value.toString();
  }
};

function AthenaDashboard() {
  const [tablesData, setTablesData] = useState({});
  const [filteredData, setFilteredData] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);
  const [selectedTable, setSelectedTable] = useState('');
  const [searchText, setSearchText] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#036649' },
      secondary: { main: '#00a676' },
      background: { default: '#f3f3f3' },
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#036649' },
      secondary: { main: '#00a676' },
      background: { default: '#121212' },
      text: { primary: '#ffffff' },
    },
  });

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

  const tableObj = selectedTable ? filteredData[selectedTable] : null;
  const fullRows = tableObj?.data || [];

  const typeDistributionData = React.useMemo(() => {
    if (!tableObj) return [];
    const typeMap = {};
    tableObj.data.forEach((row) => {
      const t = row.type || 'Unknown';
      if (!typeMap[t]) {
        typeMap[t] = 0;
      }
      typeMap[t]++;
    });
    return Object.entries(typeMap).map(([t, count]) => ({
      name: t,
      value: count,
    }));
  }, [tableObj]);

  const lineChartData = React.useMemo(() => {
    if (!tableObj) return [];
    return tableObj.data.slice(0, 10).map((row, idx) => ({
      name: row.aggregate || `Agg ${idx + 1}`,
      daysToFull: parseFloat(row['days to full']) || 0,
    }));
  }, [tableObj]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('https://1pp9bncz1e.execute-api.us-east-1.amazonaws.com/data');
      if (!res.ok) throw new Error('Failed to fetch data');
      const rawData = await res.json();

      const processed = processTablesData(rawData);
      setTablesData(processed);
      setFilteredData(processed);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAlertMessage('Failed to fetch data. Using sample data...');
      setOpenSnackbar(true);

      const sampleData = [
        {
          cluster: 'lin-netapp01',
          aggregate: 'n01_a01',
          type: 'SSD',
          year: '2020',
          month: '02',
          'used data %': '69.3',
          'available data %': '30.7',
          'daily growth rate %': '0.03',
          'days to full': '1001',
          table_name: 'AthenaTable',
        },
        {
          cluster: 'lin-netapp01',
          aggregate: 'n02_a02',
          type: 'HDD',
          year: '2021',
          month: '03',
          'used data %': '72.3',
          'available data %': '27.7',
          'daily growth rate %': '0.1',
          'days to full': '501',
          table_name: 'AthenaTable',
        },
        {
          cluster: 'lin-netapp02',
          aggregate: 'n03_a05',
          type: 'Hybrid',
          year: '2021',
          month: '04',
          'used data %': '52.1',
          'available data %': '47.9',
          'daily growth rate %': '0.2',
          'days to full': '220',
          table_name: 'AthenaTable',
        },
      ];
      const processedFallback = processTablesData(sampleData);
      setTablesData(processedFallback);
      setFilteredData(processedFallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!selectedTable) return;
    const origData = tablesData[selectedTable]?.data || [];
    const searchLower = searchText.toLowerCase();

    const newFiltered = origData.filter((row) =>
      Object.entries(row).some(([k, v]) => {
        if (isHiddenField(k) || v == null) return false;
        return v.toString().toLowerCase().includes(searchLower);
      })
    );

    setFilteredData({
      ...filteredData,
      [selectedTable]: {
        ...tablesData[selectedTable],
        data: newFiltered,
      },
    });
    setPage(0);
  };

  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRows = fullRows.slice(startIndex, endIndex);

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
    setSelectedRow(null);
    setOpenDialog(false);
  };

  const handleSnackbarClose = () => setOpenSnackbar(false);

  const exportToCSV = async () => {
    if (!selectedTable || !filteredData[selectedTable]) return;
    try {
      const dataToExport = filteredData[selectedTable].data.map((row) => {
        const exportRow = {};
        Object.entries(row).forEach(([k, v]) => {
          if (!isHiddenField(k)) {
            exportRow[formatFieldName(k)] = typeof v === 'object' ? JSON.stringify(v) : v;
          }
        });
        return exportRow;
      });

      const csv = await json2csv(dataToExport);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedTable}_${new Date().toISOString()}.csv`;
      link.click();
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setAlertMessage('Failed to export data. Please try again.');
      setOpenSnackbar(true);
    }
  };

  const handleDarkModeToggle = () => setDarkMode(!darkMode);

  if (loadingPage) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#036649',
        }}
      >
        <Typography variant="h4" style={{ color: '#ffffff', marginBottom: 20 }}>
          Welcome to Dave Dashboard
        </Typography>
        <CircularProgress style={{ color: '#ffffff' }} />
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
          <div style={{ position: 'absolute', right: 20, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" style={{ color: '#ffffff', marginRight: 8, fontSize: '0.85rem' }}>
              Dark Mode
            </Typography>
            <Switch
              checked={darkMode}
              onChange={handleDarkModeToggle}
              color="default"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#ffffff',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#ffffff',
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
                backgroundColor: darkMode ? '#333333' : '#ffffff',
                color: darkMode ? '#ffffff' : '#036649',
              }}
            >
              <MenuItem value="" disabled>
                Select Module
              </MenuItem>
              {Object.keys(filteredData).map((tableName) => (
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
              onChange={(e) => setSearchText(e.target.value)}
              value={searchText}
              style={{
                width: 300,
                backgroundColor: darkMode ? '#333333' : '#ffffff',
              }}
              InputProps={{
                startAdornment: (
                  <IconButton>
                    <SearchIcon style={{ color: darkMode ? '#ffffff' : '#036649' }} />
                  </IconButton>
                ),
                style: { color: darkMode ? '#ffffff' : '#036649' },
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
              display: 'block',
              margin: '20px auto',
              color: darkMode ? '#bb86fc' : '#036649',
            }}
          />
        ) : (
          <TableContainer
            component={Paper}
            style={{
              borderRadius: '8px',
              backgroundColor: darkMode ? '#333333' : '#ffffff',
              boxShadow: darkMode
                ? '0px 4px 8px rgba(0, 0, 0, 0.3)'
                : '0px 4px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: '#036649' }}>
                  {selectedTable &&
                    tableObj?.schema &&
                    tableObj.columnOrder?.map((key) => (
                      <TableCell
                        key={key}
                        style={{
                          color: '#ffffff',
                          fontWeight: 'bold',
                          padding: '8px',
                        }}
                      >
                        {formatFieldName(key)}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRows.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    component={motion.tr}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      backgroundColor: darkMode ? '#333333' : '#ffffff',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = darkMode ? '#444444' : '#f1f1f1')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = darkMode ? '#333333' : '#ffffff')
                    }
                    onClick={() => handleRowClick(row)}
                  >
                    {tableObj?.columnOrder?.map((colKey) => (
                      <TableCell
                        key={colKey}
                        style={{
                          padding: '8px',
                          maxWidth: '300px',
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          color: darkMode ? '#ffffff' : 'inherit',
                        }}
                      >
                        {renderCellContent(colKey, row[colKey], tableObj.schema[colKey])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={fullRows.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              style={{ color: darkMode ? '#ffffff' : '#036649' }}
            />
          </TableContainer>
        )}

        {selectedTable && (
          <Box marginTop={4}>
            <Typography variant="h6" gutterBottom>
              Additional Insights
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Paper style={{ flex: 1, minWidth: 300, padding: 16 }} elevation={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Storage Type Distribution
                </Typography>
                <Box height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={typeDistributionData}
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {typeDistributionData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={['#047857', '#0369a1', '#7c3aed', '#ea580c', '#0284c7'][index % 5]}
                          />
                        ))}
                      </Pie>
                      <ReTooltip formatter={(value, name) => [`${value} records`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>

              <Paper style={{ flex: 1, minWidth: 300, padding: 16 }} elevation={3}>
                <Typography variant="subtitle1" gutterBottom>
                  Days to Full (Line Chart)
                </Typography>
                <Box height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={lineChartData}
                      margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ReTooltip formatter={(val) => `${val} days`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="daysToFull"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Days to Full"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            style: {
              backgroundColor: darkMode ? '#333333' : '#ffffff',
              color: darkMode ? '#ffffff' : 'inherit',
            },
          }}
        >
          <DialogTitle>
            Row Details
            <IconButton
              onClick={handleCloseDialog}
              style={{
                position: 'absolute',
                right: 10,
                top: 10,
                color: darkMode ? '#ffffff' : 'inherit',
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {selectedRow &&
              tableObj?.columnOrder?.map((colKey) => (
                <Typography
                  key={colKey}
                  style={{
                    marginBottom: 10,
                    color: darkMode ? '#ffffff' : 'inherit',
                  }}
                >
                  <strong>{formatFieldName(colKey)}:</strong>{' '}
                  {renderCellContent(colKey, selectedRow[colKey], tableObj.schema[colKey])}
                </Typography>
              ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} style={{ color: '#036649' }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={openSnackbar}
          autoHideDuration={5000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={handleSnackbarClose} severity="error" sx={{ width: '100%' }}>
            {alertMessage}
          </Alert>
        </Snackbar>

        <FooterContainer>
          <Typography variant="body2">© 2024 Dave Dashboard</Typography>
          <Typography variant="body2" style={{ fontSize: '0.8rem' }}>
            Built by IT Team
          </Typography>
        </FooterContainer>
      </DashboardContainer>
    </ThemeProvider>
  );
}

export default AthenaDashboard;