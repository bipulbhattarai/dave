import requests
import csv
import sys
import urllib3

# Disable warnings for insecure HTTPS requests.
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- CONFIGURATION ---
CLUSTER_MGMT_IP = "lan-netapp01.neogen.com"
USERNAME = "BipulBhattarai"
PASSWORD = "8ykjbAXs"

# If you're using self-signed certificates in your test environment,
# you can disable SSL verification for simplicity (NOT recommended in production).
VERIFY_SSL = False
VERIFY_SSL = False                

def get_cluster_name():
    url = f"https://{CLUSTER_MGMT_IP}/api/cluster?fields=name"
    resp = requests.get(url, auth=(USERNAME, PASSWORD), verify=VERIFY_SSL)
    if resp.status_code != 200:
        print(f"ERROR: Failed to get cluster name (status {resp.status_code})")
        sys.exit(1)
    return resp.json().get("name", "Unknown_Cluster")

def list_volumes():
    # Retrieve a minimal list of volumes.
    # Requesting fields: uuid, name, svm (storage virtual machine name), state, space, and configuration.
    url = f"https://{CLUSTER_MGMT_IP}/api/storage/volumes?fields=uuid,name,svm.name,state,space,configuration"
    resp = requests.get(url, auth=(USERNAME, PASSWORD), verify=VERIFY_SSL)
    if resp.status_code != 200:
        print(f"ERROR: Failed to list volumes (status {resp.status_code})")
        sys.exit(1)
    return resp.json().get("records", [])

def get_volume_metrics(volume_uuid):
    # Attempt to retrieve the expensive properties from the metrics endpoint.
    url = f"https://{CLUSTER_MGMT_IP}/api/storage/volumes/{volume_uuid}/metrics"
    resp = requests.get(url, auth=(USERNAME, PASSWORD), verify=VERIFY_SSL)
    if resp.status_code != 200:
        print(f"WARNING: Failed to get metrics for volume {volume_uuid} (status {resp.status_code})")
        return {}
    return resp.json()  # Expecting a JSON with a "statistics" object

def bytes_to_gb(num_bytes):
    if num_bytes is None or num_bytes == 0:
        return 0
    return round(num_bytes / (1024**3), 2)

def main():
    cluster_name = get_cluster_name()
    volumes = list_volumes()
    if not volumes:
        print("No volumes found.")
        return

    csv_filename = "netapp_volume_capacity_report.csv"
    headers = [
        "Cluster",
        "Storage Virtual Machine",
        "Volume",
        "Total Data Capacity",
        "Used Data Capacity",
        "Used Data %",
        "Available Data Capacity",
        "Available Data %",
        "Daily Growth Rate %",
        "Days To Full",
        "Space Full Threshold %",
        "Space Nearly Full Threshold %",
        "Growth Rate Threshold %",
        "Growth Rate Sensitivity Threshold",
        "Days Until Full Threshold",
        "Snapshot Overflow %",
        "Snapshot Reserve Used Capacity",
        "Snapshot Reserve Used %",
        "Snapshot Reserve Available Capacity",
        "Snapshot Reserve Available %",
        "Snapshot Reserve Total Capacity",
        "Snapshot Copies Reserve Full Threshold %",
        "Snapshot Copies Count Threshold",
        "Snapshot Copies Days Until Full Threshold",
        "Number Of Inodes",
        "Inode Utilization %",
        "Inodes Full Threshold",
        "Inodes Nearly Full Threshold",
        "Quota Committed Capacity",
        "Quota Overcommitted Capacity",
        "Quota Overcommitted Threshold %",
        "Quota Nearly Overcommitted Threshold %",
        "Snapshot Autodelete",
        "Deduplication",
        "Deduplication Space Savings",
        "Compression",
        "Compression Space Savings",
        "Caching Policy",
        "Cache Retention Priority",
        "Thin Provisioned",
        "Autogrow",
        "Space Guarantee",
        "State",
        "SnapLock Type",
        "Expiry Date",
        "Tiering Policy"
    ]

    with open(csv_filename, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(headers)

        for vol in volumes:
            volume_uuid = vol.get("uuid")
            vol_name = vol.get("name", "N/A")
            svm_name = vol.get("svm", {}).get("name", "N/A")
            state = vol.get("state", "N/A")
            
            # Capacity data from the "space" object.
            space = vol.get("space", {})
            total_bytes = space.get("size", 0)
            used_bytes = space.get("used", 0)
            avail_bytes = space.get("available", 0)
            total_capacity = bytes_to_gb(total_bytes)
            used_capacity = bytes_to_gb(used_bytes)
            avail_capacity = bytes_to_gb(avail_bytes)
            used_pct = round((used_bytes / total_bytes * 100), 2) if total_bytes else 0
            avail_pct = round((avail_bytes / total_bytes * 100), 2) if total_bytes else 0

            # Retrieve the expensive properties from the metrics endpoint.
            metrics = get_volume_metrics(volume_uuid)
            stats = metrics.get("statistics", {}) if metrics else {}

            daily_growth_rate = stats.get("daily_growth_rate", "N/A")
            days_to_full = stats.get("days_to_full", "N/A")
            space_full_threshold = stats.get("space_full_threshold", "N/A")
            space_nearly_full_threshold = stats.get("space_nearly_full_threshold", "N/A")
            growth_rate_threshold = stats.get("growth_rate_threshold", "N/A")
            growth_rate_sensitivity_threshold = stats.get("growth_rate_sensitivity_threshold", "N/A")
            days_until_full_threshold = stats.get("days_until_full_threshold", "N/A")
            snapshot_overflow = stats.get("snapshot_overflow", "N/A")
            snapshot_reserve_used = stats.get("snapshot_reserve_used", "N/A")
            snapshot_reserve_used_pct = stats.get("snapshot_reserve_used_pct", "N/A")
            snapshot_reserve_available = stats.get("snapshot_reserve_available", "N/A")
            snapshot_reserve_available_pct = stats.get("snapshot_reserve_available_pct", "N/A")
            snapshot_reserve_total = stats.get("snapshot_reserve_total", "N/A")
            snapshot_copies_reserve_full_threshold = stats.get("snapshot_copies_reserve_full_threshold", "N/A")
            snapshot_copies_count_threshold = stats.get("snapshot_copies_count_threshold", "N/A")
            snapshot_copies_days_until_full_threshold = stats.get("snapshot_copies_days_until_full_threshold", "N/A")
            number_of_inodes = stats.get("number_of_inodes", "N/A")
            inode_utilization_pct = stats.get("inode_utilization_pct", "N/A")
            inodes_full_threshold = stats.get("inodes_full_threshold", "N/A")
            inodes_nearly_full_threshold = stats.get("inodes_nearly_full_threshold", "N/A")
            quota_committed_capacity = stats.get("quota_committed_capacity", "N/A")
            quota_overcommitted_capacity = stats.get("quota_overcommitted_capacity", "N/A")
            quota_overcommitted_threshold_pct = stats.get("quota_overcommitted_threshold_pct", "N/A")
            quota_nearly_overcommitted_threshold_pct = stats.get("quota_nearly_overcommitted_threshold_pct", "N/A")
            # Configuration values from the volume configuration.
            configuration = vol.get("configuration", {})
            snapshot_autodelete = configuration.get("snapshot_autodelete", "N/A")
            deduplication = configuration.get("deduplication_enabled", "N/A")
            deduplication_space_savings = stats.get("deduplication_space_savings", "N/A")
            compression = configuration.get("compression_enabled", "N/A")
            compression_space_savings = stats.get("compression_space_savings", "N/A")
            caching_policy = configuration.get("caching_policy", "N/A")
            cache_retention_priority = configuration.get("cache_retention_priority", "N/A")
            thin_provisioned = configuration.get("thin_provisioned", "N/A")
            autogrow = configuration.get("autogrow", "N/A")
            space_guarantee = configuration.get("space_guarantee", "N/A")
            snaplock_type = configuration.get("snaplock_type", "N/A")
            expiry_date = configuration.get("expiry_date", "N/A")
            tiering_policy = configuration.get("tiering_policy", "N/A")

            row = [
                cluster_name,
                svm_name,
                vol_name,
                total_capacity,
                used_capacity,
                used_pct,
                avail_capacity,
                avail_pct,
                daily_growth_rate,
                days_to_full,
                space_full_threshold,
                space_nearly_full_threshold,
                growth_rate_threshold,
                growth_rate_sensitivity_threshold,
                days_until_full_threshold,
                snapshot_overflow,
                snapshot_reserve_used,
                snapshot_reserve_used_pct,
                snapshot_reserve_available,
                snapshot_reserve_available_pct,
                snapshot_reserve_total,
                snapshot_copies_reserve_full_threshold,
                snapshot_copies_count_threshold,
                snapshot_copies_days_until_full_threshold,
                number_of_inodes,
                inode_utilization_pct,
                inodes_full_threshold,
                inodes_nearly_full_threshold,
                quota_committed_capacity,
                quota_overcommitted_capacity,
                quota_overcommitted_threshold_pct,
                quota_nearly_overcommitted_threshold_pct,
                snapshot_autodelete,
                deduplication,
                deduplication_space_savings,
                compression,
                compression_space_savings,
                caching_policy,
                cache_retention_priority,
                thin_provisioned,
                autogrow,
                space_guarantee,
                state,
                snaplock_type,
                expiry_date,
                tiering_policy
            ]
            writer.writerow(row)

    print(f"Report generated: {csv_filename}")

if __name__ == "__main__":
    main()
