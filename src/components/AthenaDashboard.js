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
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 20,
  backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f7f7f7',
  padding: '10px',
  borderRadius: '8px',
  boxShadow: theme.shadows[3],
  gap: '10px',
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
    .replace(/"|'/g, '') // Remove quotes
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
  if (typeof value === 'number' || !isNaN(Number(value))) return 'number';
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
      return Number(value).toLocaleString();
    default:
      return value.toString();
  }
};

function AthenaDashboard() {
  const [tableData, setTableData] = useState({ data: [], schema: {}, columnOrder: [] });
  const [filteredData, setFilteredData] = useState({ data: [], schema: {}, columnOrder: [] });
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

  // Filter states for csv_data
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('');

  // Filter states for 2025_03_19_restorepoints
  const [selectedVeeamServer, setSelectedVeeamServer] = useState('');
  const [selectedVMName, setSelectedVMName] = useState('');

  // Filter states for 2025_03_19_backupstatus
  const [selectedVCenter, setSelectedVCenter] = useState('');
  const [selectedBackupVMName, setSelectedBackupVMName] = useState('');
  const [selectedShouldBackup, setSelectedShouldBackup] = useState('');

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
      setLoadingPage(false);
    }, 1500);
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchData();
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTable) {
      handleFilter();
    }
  }, [
    selectedTable,
    searchText,
    selectedYear,
    selectedMonth,
    selectedCluster,
    selectedVeeamServer,
    selectedVMName,
    selectedVCenter,
    selectedBackupVMName,
    selectedShouldBackup,
  ]);

  const fetchData = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ table: selectedTable }).toString();
      const res = await fetch(`https://1pp9bncz1e.execute-api.us-east-1.amazonaws.com/athena_query?${queryParams}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const rawData = await res.json();

      const { schema, columnOrder } = detectTableStructure(rawData);
      const processedData = { data: rawData, schema, columnOrder };
      setTableData(processedData);
      setFilteredData(processedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAlertMessage('Failed to fetch data. Using sample data...');
      setOpenSnackbar(true);

      const sampleData =
        selectedTable === 'csv_data'
          ? [
              {
                'cluster name': 'lin-netapp01',
                'aggregate name': 'n01_a01',
                type: 'SSD',
                year: '2020',
                month: '02',
                'used data %': '69.3',
                'available data %': '30.7',
              },
            ]
          : selectedTable === '2025_03_19_restorepoints'
          ? [
              {
                veeamserver: 'server1',
                vmname: 'vm1',
                restorepoints: '5',
                col3: '100',
              },
            ]
          : selectedTable === '2025_03_19_backupstatus'
          ? [
              {
                vcenter: 'vcenter1',
                vmname: 'vm2',
                shouldbackup: true,
              },
            ]
          : [];
      const { schema, columnOrder } = detectTableStructure(sampleData);
      const processedFallback = { data: sampleData, schema, columnOrder };
      setTableData(processedFallback);
      setFilteredData(processedFallback);
    } finally {
      setLoading(false);
    }
  };

  const getFilterOptions = (data, key) => {
    if (!data.data.length) return [];
    const uniqueValues = new Set(data.data.map((row) => row[key]?.toString() || ''));
    return ['', ...Array.from(uniqueValues).sort()];
  };

  const years = getFilterOptions(tableData, 'year');
  const months = getFilterOptions(tableData, 'month');
  const clusters = getFilterOptions(tableData, 'cluster name');
  const veeamServers = getFilterOptions(tableData, 'veeamserver');
  const vmNames = getFilterOptions(tableData, 'vmname');
  const vcenters = getFilterOptions(tableData, 'vcenter');
  const backupVMNames = getFilterOptions(tableData, 'vmname');
  const shouldBackupOptions = getFilterOptions(tableData, 'shouldbackup');

  const handleFilter = () => {
    if (!selectedTable) return;
    let filtered = [...tableData.data];
    const searchLower = searchText.toLowerCase();

    filtered = filtered.filter((row) => {
      const matchesSearch = searchText
        ? Object.entries(row).some(([k, v]) => {
            if (isHiddenField(k) || v == null) return false;
            return v.toString().toLowerCase().includes(searchLower);
          })
        : true;

      if (selectedTable === 'csv_data') {
        const matchesYear = selectedYear ? row.year === selectedYear : true;
        const matchesMonth = selectedMonth ? row.month === selectedMonth : true;
        const matchesCluster = selectedCluster ? row['cluster name'] === selectedCluster : true;
        return matchesSearch && matchesYear && matchesMonth && matchesCluster;
      } else if (selectedTable === '2025_03_19_restorepoints') {
        const matchesVeeamServer = selectedVeeamServer ? row.veeamserver === selectedVeeamServer : true;
        const matchesVMName = selectedVMName ? row.vmname === selectedVMName : true;
        return matchesSearch && matchesVeeamServer && matchesVMName;
      } else if (selectedTable === '2025_03_19_backupstatus') {
        const matchesVCenter = selectedVCenter ? row.vcenter === selectedVCenter : true;
        const matchesBackupVMName = selectedBackupVMName ? row.vmname === selectedBackupVMName : true;
        const matchesShouldBackup = selectedShouldBackup
          ? row.shouldbackup.toString() === selectedShouldBackup
          : true;
        return matchesSearch && matchesVCenter && matchesBackupVMName && matchesShouldBackup;
      }
      return matchesSearch;
    });

    setFilteredData({ ...tableData, data: filtered });
    setPage(0);
  };

  const fullRows = filteredData.data || [];
  const typeDistributionData = React.useMemo(() => {
    const typeMap = {};
    fullRows.forEach((row) => {
      let t;
      if (selectedTable === 'csv_data') {
        t = row.type || 'Unknown';
      } else if (selectedTable === '2025_03_19_restorepoints') {
        t = row.restorepoints || 'Unknown';
      } else if (selectedTable === '2025_03_19_backupstatus') {
        t = row.shouldbackup ? 'Yes' : 'No'; // Use boolean as categorical data
      } else {
        t = 'Unknown';
      }
      typeMap[t] = (typeMap[t] || 0) + 1;
    });
    return Object.entries(typeMap).map(([t, count]) => ({ name: t, value: count }));
  }, [fullRows, selectedTable]);

  const lineChartData = React.useMemo(() => {
    return fullRows.slice(0, 10).map((row, idx) => ({
      name: row['aggregate name'] || row.vmname || `Item ${idx + 1}`,
      value:
        selectedTable === 'csv_data'
          ? parseFloat(row['used data %']) || 0
          : selectedTable === '2025_03_19_restorepoints'
          ? parseFloat(row.col3) || 0
          : selectedTable === '2025_03_19_backupstatus'
          ? row.shouldbackup ? 1 : 0 // Convert boolean to 1/0 for plotting
          : 0,
    }));
  }, [fullRows, selectedTable]);

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
    if (!selectedTable || !filteredData.data.length) return;
    try {
      const dataToExport = filteredData.data.map((row) => {
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
          <Tooltip title="Select Table">
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
                Select Table
              </MenuItem>
              <MenuItem value="csv_data">Storage Metrics</MenuItem>
              <MenuItem value="2025_03_19_restorepoints">Veeam Restore Points</MenuItem>
              <MenuItem value="2025_03_19_backupstatus">Backup Status</MenuItem>
            </Select>
          </Tooltip>

          {selectedTable === 'csv_data' && (
            <>
              <Tooltip title="Filter by Year">
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 150,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>

              <Tooltip title="Filter by Month">
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 150,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All Months</MenuItem>
                  {months.map((month) => (
                    <MenuItem key={month} value={month}>
                      {month || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>

              <Tooltip title="Filter by Cluster">
                <Select
                  value={selectedCluster}
                  onChange={(e) => setSelectedCluster(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 200,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All Clusters</MenuItem>
                  {clusters.map((cluster) => (
                    <MenuItem key={cluster} value={cluster}>
                      {cluster || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>
            </>
          )}

          {selectedTable === '2025_03_19_restorepoints' && (
            <>
              <Tooltip title="Filter by Veeam Server">
                <Select
                  value={selectedVeeamServer}
                  onChange={(e) => setSelectedVeeamServer(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 200,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All Veeam Servers</MenuItem>
                  {veeamServers.map((server) => (
                    <MenuItem key={server} value={server}>
                      {server || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>

              <Tooltip title="Filter by VM Name">
                <Select
                  value={selectedVMName}
                  onChange={(e) => setSelectedVMName(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 200,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All VM Names</MenuItem>
                  {vmNames.map((vm) => (
                    <MenuItem key={vm} value={vm}>
                      {vm || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>
            </>
          )}

          {selectedTable === '2025_03_19_backupstatus' && (
            <>
              <Tooltip title="Filter by vCenter">
                <Select
                  value={selectedVCenter}
                  onChange={(e) => setSelectedVCenter(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 200,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All vCenters</MenuItem>
                  {vcenters.map((vcenter) => (
                    <MenuItem key={vcenter} value={vcenter}>
                      {vcenter || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>

              <Tooltip title="Filter by VM Name">
                <Select
                  value={selectedBackupVMName}
                  onChange={(e) => setSelectedBackupVMName(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 200,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All VM Names</MenuItem>
                  {backupVMNames.map((vm) => (
                    <MenuItem key={vm} value={vm}>
                      {vm || 'N/A'}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>

              <Tooltip title="Filter by Should Backup">
                <Select
                  value={selectedShouldBackup}
                  onChange={(e) => setSelectedShouldBackup(e.target.value)}
                  displayEmpty
                  variant="outlined"
                  style={{
                    width: 200,
                    backgroundColor: darkMode ? '#333333' : '#ffffff',
                    color: darkMode ? '#ffffff' : '#036649',
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </Tooltip>
            </>
          )}

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
                    filteredData.schema &&
                    filteredData.columnOrder?.map((key) => (
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
                    {filteredData.columnOrder?.map((colKey) => (
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
                        {renderCellContent(colKey, row[colKey], filteredData.schema[colKey])}
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
                  {selectedTable === 'csv_data'
                    ? 'Storage Type Distribution'
                    : selectedTable === '2025_03_19_restorepoints'
                    ? 'Restore Points Distribution'
                    : 'Should Backup Distribution'}
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
                  {selectedTable === 'csv_data'
                    ? 'Used Data % (Line Chart)'
                    : selectedTable === '2025_03_19_restorepoints'
                    ? 'Col3 Value (Line Chart)'
                    : 'Should Backup (Line Chart)'}
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
                      <ReTooltip formatter={(val) => `${val}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name={
                          selectedTable === 'csv_data'
                            ? 'Used Data %'
                            : selectedTable === '2025_03_19_restorepoints'
                            ? 'Col3'
                            : 'Should Backup'
                        }
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
              filteredData.columnOrder?.map((colKey) => (
                <Typography
                  key={colKey}
                  style={{
                    marginBottom: 10,
                    color: darkMode ? '#ffffff' : 'inherit',
                  }}
                >
                  <strong>{formatFieldName(colKey)}:</strong>{' '}
                  {renderCellContent(colKey, selectedRow[colKey], filteredData.schema[colKey])}
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