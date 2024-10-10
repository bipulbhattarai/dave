import { message, Skeleton, Table } from "antd";
import { useEffect, useState } from "react";

const App = () => {

  const [statuses, setStatuses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("https://ayr7fudi20.execute-api.us-east-1.amazonaws.com/Test-stage/data").then(res => res.json()).then(res => {
      setLoading(false)
      setStatuses(res)
    }).catch(err=>{
      setLoading(false)
      message.error("Couldn't fetch status")
    })
  }, [])


  const dataSource = statuses.map((item, index) => ({
    key: String(index + 1),
    vmname: item.vmname,
    vm_id: item.vm_id,
    backup_status: item.backup_status,
    backup_date: item.backup_date
  }));

  // Defining columns
  const columns = [
    {
      title: 'VM Name',
      dataIndex: 'vmname',
      key: 'vmname',
    },
    {
      title: 'VM ID',
      dataIndex: 'vm_id',
      key: 'vm_id',
    },
    {
      title: 'Backup Status',
      dataIndex: 'backup_status',
      key: 'backup_status',
    },
    {
      title: 'Backup Date',
      dataIndex: 'backup_date',
      key: 'backup_date',
    }
  ];


  return (
    <div>
      <div style={{ width: '100%', height: 50, backgroundColor: '#004D40', color: '#fff', display: 'flex', alignItems: 'center', padding: 10, fontSize: 20, fontWeight: '600', justifyContent: 'center' }}>
        Dave - Dashboard
      </div>

      {loading ? <Skeleton /> : <Table dataSource={dataSource} columns={columns} />}

    </div>
  );
}

export default App;
