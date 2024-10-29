import { message, Skeleton, Table, Select, Typography } from "antd";
import { useEffect, useState } from "react";
import '../src/App.css'; // Ensure this path is correct

const { Option } = Select;

const App = () => {
  const [tablesData, setTablesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null); // Set to null for initial state

  useEffect(() => {
    setLoading(true);
    fetch("https://o2merk3yse.execute-api.us-east-1.amazonaws.com/dev/data")
      .then(res => res.json())
      .then(data => {
        setLoading(false);
        const groupedData = groupAndGenerateColumns(data);
        setTablesData(groupedData);
      })
      .catch(err => {
        setLoading(false);
        message.error("Couldn't fetch data");
      });
  }, []);

  const groupAndGenerateColumns = (data) => {
    const groups = data.reduce((acc, item) => {
      const tableName = item.table_name;
      if (!acc[tableName]) {
        acc[tableName] = { data: [], keys: new Set() };
      }
      acc[tableName].data.push(item);
      Object.keys(item).forEach(key => {
        if (key !== 'table_name') acc[tableName].keys.add(key);
      });
      return acc;
    }, {});

    Object.keys(groups).forEach(tableName => {
      groups[tableName].columns = Array.from(groups[tableName].keys).map(key => ({
        title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        dataIndex: key,
        key: key,
        render: (text, record) => {
          if (key === "backup_status") {
            return <span style={{ color: text === "Fail" ? 'red' : 'green' }}>{text}</span>;
          }
          return text;
        }
      }));
    });

    return groups;
  };

  const handleTableChange = value => {
    setSelectedTable(value);
  };

  return (
    <div>
      <Typography.Title level={3} style={{ textAlign: 'center', backgroundColor: '#004D40', color: '#fff', height: 50, display: 'flex', alignItems: 'center', padding: 10, fontSize: 20, fontWeight: '600', justifyContent: 'center' }}>Dave - Dashboard</Typography.Title>
      <Select
        value={selectedTable}
        style={{ width: 200, marginBottom: 20 }}
        onChange={handleTableChange}
        placeholder="Select Module"
        className="custom-select"
      >
        {Object.keys(tablesData).map(tableName => (
          <Option key={tableName} value={tableName}>{tableName}</Option>
        ))}
      </Select>

      {loading ? <Skeleton /> : (
        selectedTable && tablesData[selectedTable] ? (
          <Table 
            dataSource={tablesData[selectedTable].data} 
            columns={tablesData[selectedTable].columns} 
            rowClassName={(record) => record.backup_status === "Fail" ? 'backup-fail' : 'backup-success'}
          />
        ) : <Typography.Text>No Data</Typography.Text>
      )}
    </div>
  );
}

export default App;
