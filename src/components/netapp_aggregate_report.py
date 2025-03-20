import requests
import csv
import sys

# --- CONFIGURE THESE VALUES ---
CLUSTER_MGMT_IP = "lan-netapp01.neogen.com"
USERNAME = "BipulBhattarai"
PASSWORD = "8ykjbAXs"

# If you're using self-signed certificates in your test environment,
# you can disable SSL verification for simplicity (NOT recommended in production).
VERIFY_SSL = False

# --- DISABLE WARNING FOR SELF-SIGNED CERTS ---
if not VERIFY_SSL:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_cluster_name():
    """
    Fetch the cluster name from ONTAP REST API.
    """
    url = f"https://{CLUSTER_MGMT_IP}/api/cluster?fields=name"
    resp = requests.get(url, auth=(USERNAME, PASSWORD), verify=VERIFY_SSL)
    if resp.status_code != 200:
        print("ERROR: Failed to get cluster name")
        print(resp.text)
        sys.exit(1)
    data = resp.json()
    print("Raw JSON response from /api/storage/aggregates:\n")
    print(data)
    # The cluster name is typically under data["name"] if found
    #return data.get("name", "Unknown_Cluster")

def get_aggregates():
    """
    Fetch aggregates from the ONTAP REST API.
    We specify fields that are likely relevant for capacity, state, RAID type, SnapLock, etc.
    Some of these fields may not be available in 9.7 or might have slightly different names;
    adjust as needed.
    """
    # You can expand or adjust 'fields' based on the 9.7 REST documentation.
    fields = [
        "name",
        "node.name",
        "state",
        "raid_type",
        "snaplock_type",
        "block_storage.primary.size",
        "block_storage.primary.used",
        "block_storage.primary.available",
        "block_storage.cloud_storage.used",
        "block_storage.cloud_storage.name",
        "block_storage.snapshots.size",
        "block_storage.snapshots.used",
    ]
    field_str = ",".join(fields)
    print(f"Fetching aggregates with fields: {field_str}")
    url = (
        f"https://{CLUSTER_MGMT_IP}/api/storage/aggregates"
        f"?fields={field_str}"
        f"&return_timeout=60"
    )
    resp = requests.get(url, auth=(USERNAME, PASSWORD), verify=VERIFY_SSL)
    if resp.status_code != 200:
        print(f"ERROR: Failed to get aggregates (status {resp.status_code})")
        print(resp.text)
        sys.exit(1)

    return resp.json().get("records", [])

def bytes_to_gb(bytes_val):
    """
    Convert bytes to gigabytes (integer or float as needed).
    """
    if bytes_val is None:
        return 0
    return round(bytes_val / (1024**3), 2)

def main():
    cluster_name = get_cluster_name()
    aggregates = get_aggregates()

    csv_filename = "netapp_aggregates_report.csv"

    # Define the CSV columns exactly as you specified
    headers = [
        "Cluster",
        "HA Pair",
        "Aggregate",
        "Total Data Capacity (GB)",
        "Used Data Capacity (GB)",
        "Used Data %",
        "Available Data Capacity (GB)",
        "Available Data %",
        "Daily Growth Rate %",
        "Days To Full",
        "Space Full Threshold (%)",
        "Space Nearly Full Threshold (%)",
        "Growth Rate Threshold (%)",
        "Growth Rate Sensitivity Threshold",
        "Days Until Full Threshold",
        "Snapshot Reserve Total Capacity (GB)",
        "Snapshot Reserve Used Capacity (GB)",
        "Snapshot Reserve Used %",
        "Snapshot Reserve Available Capacity (GB)",
        "Snapshot Reserve Available %",
        "Snapshot Copies Reserve Full Threshold (%)",
        "Overcommitted Capacity %",
        "Overcommitted Threshold (%)",
        "Nearly Overcommitted Threshold (%)",
        "Type",
        "RAID Type",
        "Aggregate State",
        "SnapLock Type",
        "Cloud Tier Space Used (GB)",
        "Cloud Tier",
    ]

    with open(csv_filename, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)

        for aggr in aggregates:
            aggr_name = aggr.get("name", "N/A")
            aggr_type = aggr.get("type", "N/A")
            aggr_state = aggr.get("state", "N/A")
            raid_type = aggr.get("raid_type", "N/A")
            snaplock_type = aggr.get("snaplock_type", "none")

            # The node name can stand in for "HA Pair" if you want to group nodes in pairs.
            # ONTAP doesn't directly provide "HA Pair" as a single field in the aggregator record.
            node_info = aggr.get("node", {})
            ha_pair_name = node_info.get("name", "N/A")

            # Primary block storage stats
            primary = aggr.get("block_storage", {}).get("primary", {})
            total_bytes = primary.get("size", 0)
            used_bytes = primary.get("used", 0)
            avail_bytes = primary.get("available", 0)

            total_gb = bytes_to_gb(total_bytes)
            used_gb = bytes_to_gb(used_bytes)
            avail_gb = bytes_to_gb(avail_bytes)

            used_pct = round((used_bytes / total_bytes * 100), 2) if total_bytes else 0
            avail_pct = round((avail_bytes / total_bytes * 100), 2) if total_bytes else 0

            # Snapshot reserve storage
            snapshots = aggr.get("block_storage", {}).get("snapshots", {})
            snap_total = bytes_to_gb(snapshots.get("size", 0))
            snap_used = bytes_to_gb(snapshots.get("used", 0))
            snap_used_pct = round((snapshots.get("used", 0) / snapshots.get("size", 1) * 100), 2) \
                            if snapshots.get("size", 0) else 0
            snap_avail = snap_total - snap_used
            snap_avail_pct = round(100 - snap_used_pct, 2)

            # Cloud tier info (FabricPool) if present
            cloud_storage = aggr.get("block_storage", {}).get("cloud_storage", {})
            cloud_used_bytes = cloud_storage.get("used", 0)
            cloud_used_gb = bytes_to_gb(cloud_used_bytes)
            cloud_tier_name = cloud_storage.get("name", "N/A")

            # Placeholder or N/A for the fields not exposed via aggregator REST
            daily_growth_rate = "N/A"               # Typically requires historical data
            days_to_full = "N/A"                    # Also requires growth trends
            space_full_threshold = "N/A"            # Usually a configured threshold or UM policy
            space_nearly_full_threshold = "N/A"
            growth_rate_threshold = "N/A"
            growth_rate_sensitivity_threshold = "N/A"
            days_until_full_threshold = "N/A"
            snapshot_copies_reserve_full_threshold = "N/A"
            overcommitted_capacity_pct = "N/A"
            overcommitted_threshold_pct = "N/A"
            nearly_overcommitted_threshold_pct = "N/A"

            row = [
                cluster_name,                      # Cluster
                ha_pair_name,                      # HA Pair (really node name here)
                aggr_name,                         # Aggregate
                total_gb,                          # Total Data Capacity (GB)
                used_gb,                           # Used Data Capacity (GB)
                used_pct,                          # Used Data %
                avail_gb,                          # Available Data Capacity (GB)
                avail_pct,                         # Available Data %
                daily_growth_rate,                 # Daily Growth Rate %
                days_to_full,                      # Days To Full
                space_full_threshold,              # Space Full Threshold (%)
                space_nearly_full_threshold,       # Space Nearly Full Threshold (%)
                growth_rate_threshold,             # Growth Rate Threshold (%)
                growth_rate_sensitivity_threshold, # Growth Rate Sensitivity Threshold
                days_until_full_threshold,         # Days Until Full Threshold
                snap_total,                        # Snapshot Reserve Total Capacity (GB)
                snap_used,                         # Snapshot Reserve Used Capacity (GB)
                snap_used_pct,                     # Snapshot Reserve Used %
                snap_avail,                        # Snapshot Reserve Available Capacity (GB)
                snap_avail_pct,                    # Snapshot Reserve Available %
                snapshot_copies_reserve_full_threshold,  # Snapshot Copies Reserve Full Threshold (%)
                overcommitted_capacity_pct,        # Overcommitted Capacity %
                overcommitted_threshold_pct,       # Overcommitted Threshold (%)
                nearly_overcommitted_threshold_pct,# Nearly Overcommitted Threshold (%)
                aggr_type,                         # Type
                raid_type,                         # RAID Type
                aggr_state,                        # Aggregate State
                snaplock_type,                     # SnapLock Type
                cloud_used_gb,                     # Cloud Tier Space Used (GB)
                cloud_tier_name,                   # Cloud Tier
            ]
            writer.writerow(row)

    print(f"Report generated: {csv_filename}")

if __name__ == "__main__":
    main()
