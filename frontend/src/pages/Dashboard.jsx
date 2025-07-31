import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Table,
  Tag,
  Alert,
  Spin,
  DatePicker,
  Select,
  Button,
} from "antd";
import {
  ShoppingCartOutlined,
  UserOutlined,
  DollarCircleOutlined,
  ShopOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Line, Column, Pie } from "@ant-design/charts";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../hooks/useAuth";
import { useFormatters } from "../utils/formatters";
import dashboardService from "../services/dashboardService";
import QuickNotificationFAB from "../components/common/QuickNotificationFAB";
import api from "../services/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    formatCurrency,
    formatNumber,
    formatDate,
    formatPercentage,
    formatCompactNumber,
  } = useFormatters();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [period, setPeriod] = useState("week");
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState({});
  const [orderFlow, setOrderFlow] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [customerStats, setCustomerStats] = useState({});
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [shippingAnalytics, setShippingAnalytics] = useState(null);

  useEffect(() => {
    loadDashboardData();
    loadShippingAnalytics();
  }, [dateRange]);

  useEffect(() => {
    loadOrderFlow();
    loadSalesData();
  }, [period, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Prepare date range parameters
      const dateParams =
        dateRange && dateRange.length === 2
          ? {
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : {};

      const [
        statsResponse,
        topProductsResponse,
        recentOrdersResponse,
        customerStatsResponse,
        inventoryAlertsResponse,
      ] = await Promise.all([
        dashboardService.getDashboardStats(dateParams),
        dashboardService.getTopProducts(10, dateParams),
        dashboardService.getRecentOrders(10, dateParams),
        dashboardService.getCustomerStats(dateParams),
        dashboardService.getInventoryAlerts(),
      ]);

      setStats(statsResponse.data);
      setTopProducts(topProductsResponse.data);
      setRecentOrders(recentOrdersResponse.data);
      setCustomerStats(customerStatsResponse.data);
      setInventoryAlerts(inventoryAlertsResponse.data);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderFlow = async () => {
    try {
      const params =
        dateRange && dateRange.length === 2
          ? {
              period,
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : { period };

      const response = await dashboardService.getOrderFlow(params);
      setOrderFlow(response.data);
    } catch (error) {
      console.error("Error loading order flow:", error);
    }
  };

  const loadSalesData = async () => {
    try {
      const params =
        dateRange && dateRange.length === 2
          ? {
              period,
              startDate: dateRange[0].format("YYYY-MM-DD"),
              endDate: dateRange[1].format("YYYY-MM-DD"),
            }
          : { period };

      const response = await dashboardService.getSalesData(params);
      setSalesData(response.data);
    } catch (error) {
      console.error("Error loading sales data:", error);
    }
  };

  const loadShippingAnalytics = async () => {
    try {
      const response = await api.get("/shipping/analytics");
      setShippingAnalytics(response.data.data);
    } catch (error) {
      console.error("Error loading shipping analytics:", error);
    }
  };

  const refreshData = async () => {
    setStatsLoading(true);
    await loadDashboardData();
    await loadOrderFlow();
    await loadSalesData();
    setStatsLoading(false);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
    // Clear period when using custom date range
    if (dates && dates.length === 2) {
      setPeriod("custom");
    }
  };

  const handlePeriodChange = (value) => {
    setPeriod(value);
    // Clear date range when using predefined periods
    if (value !== "custom") {
      setDateRange(null);
    }
  };

  const clearFilters = () => {
    setPeriod("week");
    setDateRange(null);
  };

  // Chart configurations
  const orderFlowConfig = {
    data: orderFlow,
    xField: "period",
    yField: "orders",
    point: {
      size: 5,
      shape: "diamond",
    },
    label: {
      style: {
        fill: "#aaa",
      },
    },
    smooth: true,
    color: "#1890ff",
    meta: {
      orders: {
        alias: t("dashboard.orders"),
        formatter: (value) => formatNumber(value),
      },
      period: {
        alias: t("dashboard.period"),
        formatter: (value) => {
          // Try to parse as date and format, fallback to original value
          const date = dayjs(value);
          return date.isValid() ? date.format("YYYY/MM/DD") : value;
        },
      },
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: t("dashboard.orders"),
          value: formatNumber(datum.orders),
        };
      },
    },
    yAxis: {
      label: {
        formatter: (value) => formatNumber(value),
      },
      title: {
        text: t("dashboard.orders"),
      },
    },
    xAxis: {
      label: {
        formatter: (value) => {
          // Try to parse as date and format, fallback to original value
          const date = dayjs(value);
          return date.isValid() ? date.format("YYYY/MM/DD") : value;
        },
        rotate: 0, // Make labels horizontal
        style: {
          textAlign: "center",
          fontSize: "12px",
        },
        autoRotate: false, // Disable auto rotation
      },
      title: {
        text: t("dashboard.period"),
      },
    },
  };

  const salesColumnConfig = {
    data: salesData,
    xField: "date",
    yField: "revenue",
    color: "#52c41a",
    columnWidthRatio: 0.8,
    meta: {
      revenue: {
        alias: t("dashboard.revenue"),
        formatter: (value) => formatCurrency(value),
      },
      date: {
        alias: t("dashboard.date"),
        formatter: (value) => dayjs(value).format("YYYY/MM/DD"),
      },
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name: t("dashboard.revenue"),
          value: formatCurrency(datum.revenue),
        };
      },
    },
    yAxis: {
      label: {
        formatter: (value) => formatCurrency(value),
      },
      title: {
        text: t("dashboard.revenue"),
      },
    },
    xAxis: {
      label: {
        formatter: (value) => dayjs(value).format("YYYY/MM/DD"),
        rotate: 0, // Make labels horizontal
        style: {
          textAlign: "center",
          fontSize: "12px",
        },
        autoRotate: false, // Disable auto rotation
      },
      title: {
        text: t("dashboard.date"),
      },
    },
  };

  const orderStatusConfig = {
    appendPadding: 10,
    data: stats.orderStatusDistribution || [],
    angleField: "count",
    colorField: "order_status",
    radius: 0.75,
    label: {
      type: "spider",
      labelHeight: 28,
      content: "{name}\n{percentage}",
      formatter: (datum, mappingData) => {
        const { count } = datum;
        return `${
          t(`dashboard.status_${datum.order_status}`) || datum.order_status
        }\n${formatNumber(count)}`;
      },
    },
    tooltip: {
      formatter: (datum) => {
        return {
          name:
            t(`dashboard.status_${datum.order_status}`) || datum.order_status,
          value: formatNumber(datum.count),
        };
      },
    },
    interactions: [
      {
        type: "element-selected",
      },
      {
        type: "element-active",
      },
    ],
  };

  // Table columns
  const orderColumns = [
    {
      title: t("dashboard.orderId"),
      dataIndex: "order_number",
      key: "order_number",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t("dashboard.customer"),
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: t("dashboard.amount"),
      dataIndex: "total_amount",
      key: "total_amount",
      render: (amount) => <Text strong>{formatCurrency(amount)}</Text>,
    },
    {
      title: t("dashboard.status"),
      dataIndex: "order_status",
      key: "order_status",
      render: (status) => {
        const colors = {
          pending: "warning",
          confirmed: "processing",
          preparing: "blue",
          ready: "cyan",
          out_for_delivery: "geekblue",
          delivered: "success",
          cancelled: "error",
        };
        return (
          <Tag color={colors[status] || "default"}>
            {t(`dashboard.status_${status}`) || status}
          </Tag>
        );
      },
    },
    {
      title: t("dashboard.date"),
      dataIndex: "created_at",
      key: "created_at",
      render: (date) => formatDate(date, "short"),
    },
  ];

  const topProductsColumns = [
    {
      title: t("dashboard.product"),
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: t("dashboard.sold"),
      dataIndex: "total_sold",
      key: "total_sold",
      render: (value) => <Text>{formatNumber(value)}</Text>,
    },
    {
      title: t("dashboard.revenue"),
      dataIndex: "total_revenue",
      key: "total_revenue",
      render: (value) => (
        <Text strong type="success">
          {formatCurrency(value)}
        </Text>
      ),
    },
  ];

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              {t("dashboard.title")}
            </Title>
            <Text type="secondary">{t("dashboard.subtitle")}</Text>
          </Col>
          <Col>
            <Space>
              <Select
                value={period}
                onChange={handlePeriodChange}
                style={{ width: 120 }}
              >
                <Option value="day">{t("dashboard.today")}</Option>
                <Option value="week">{t("dashboard.thisWeek")}</Option>
                <Option value="month">{t("dashboard.thisMonth")}</Option>
                <Option value="year">{t("dashboard.thisYear")}</Option>
                <Option value="custom">{t("dashboard.customRange")}</Option>
              </Select>

              {period === "custom" && (
                <RangePicker
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  style={{ width: 240 }}
                  placeholder={[
                    t("dashboard.startDate"),
                    t("dashboard.endDate"),
                  ]}
                  format="YYYY-MM-DD"
                />
              )}

              {(period === "custom" || dateRange) && (
                <Button
                  onClick={clearFilters}
                  title={t("dashboard.clearFilters")}
                >
                  {t("dashboard.clear")}
                </Button>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={refreshData}
                loading={statsLoading}
              >
                {t("common.refresh")}
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalOrders")}
              value={formatCompactNumber(stats.totalOrders || 0)}
              prefix={<ShoppingCartOutlined />}
              suffix={
                <span
                  style={{
                    fontSize: "14px",
                    color: stats.ordersGrowth >= 0 ? "#52c41a" : "#ff4d4f",
                  }}
                >
                  {stats.ordersGrowth >= 0 ? (
                    <RiseOutlined />
                  ) : (
                    <FallOutlined />
                  )}
                  {formatPercentage(stats.ordersGrowth || 0)}
                </span>
              }
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalRevenue")}
              value={formatCurrency(stats.totalRevenue || 0)}
              prefix={<DollarCircleOutlined />}
              suffix={
                <span
                  style={{
                    fontSize: "14px",
                    color: stats.revenueGrowth >= 0 ? "#52c41a" : "#ff4d4f",
                  }}
                >
                  {stats.revenueGrowth >= 0 ? (
                    <RiseOutlined />
                  ) : (
                    <FallOutlined />
                  )}
                  {formatPercentage(stats.revenueGrowth || 0)}
                </span>
              }
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.totalCustomers")}
              value={formatCompactNumber(stats.totalCustomers || 0)}
              prefix={<UserOutlined />}
              suffix={
                <span
                  style={{
                    fontSize: "14px",
                    color: stats.customersGrowth >= 0 ? "#52c41a" : "#ff4d4f",
                  }}
                >
                  {stats.customersGrowth >= 0 ? (
                    <RiseOutlined />
                  ) : (
                    <FallOutlined />
                  )}
                  {formatPercentage(stats.customersGrowth || 0)}
                </span>
              }
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.averageOrder")}
              value={formatCurrency(stats.averageOrderValue || 0)}
              prefix={<ShopOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Shipping Analytics */}
      {shippingAnalytics && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col span={24}>
            <Card
              title="🚚 Jordan Shipping Analytics"
              extra={
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={loadShippingAnalytics}
                >
                  Refresh
                </Button>
              }
            >
              <Row gutter={16}>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="Avg Distance"
                    value={
                      shippingAnalytics.distance_statistics?.avg_distance || 0
                    }
                    suffix="km"
                    precision={1}
                    prefix="🛣️"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="Avg Shipping Cost"
                    value={
                      shippingAnalytics.distance_statistics
                        ?.avg_shipping_cost || 0
                    }
                    suffix="JOD"
                    precision={2}
                    prefix="💰"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="Free Shipping Rate"
                    value={
                      shippingAnalytics.free_shipping_analysis
                        ?.free_shipping_percentage || 0
                    }
                    suffix="%"
                    precision={1}
                    prefix="🎁"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Statistic
                    title="Total Calculations"
                    value={
                      shippingAnalytics.calculation_summary
                        ?.total_calculations || 0
                    }
                    prefix="📊"
                  />
                </Col>
              </Row>

              {shippingAnalytics.zone_usage && (
                <div style={{ marginTop: 16 }}>
                  <Title level={5}>Popular Zones</Title>
                  <Row gutter={8}>
                    {shippingAnalytics.zone_usage
                      .slice(0, 3)
                      .map((zone, index) => (
                        <Col key={zone.zone_name_en}>
                          <Tag
                            color={["blue", "green", "orange"][index]}
                            style={{ marginBottom: 4 }}
                          >
                            {zone.zone_name_en}: {zone.usage_count} orders
                          </Tag>
                        </Col>
                      ))}
                  </Row>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts Row */}
      <Row gutter={[16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          <Card
            title={t("dashboard.orderFlow")}
            extra={
              <Text type="secondary">
                {period === "custom" && dateRange && dateRange.length === 2
                  ? `${dateRange[0].format("MMM DD")} - ${dateRange[1].format(
                      "MMM DD, YYYY"
                    )}`
                  : t(`dashboard.${period}`)}
              </Text>
            }
            bodyStyle={{ padding: 0 }} // Optional: reduce padding if needed
          >
            {orderFlow.length > 0 ? (
              <div style={{ width: "100%", padding: 16 }}>
                <Line {...orderFlowConfig} height={300} />
              </div>
            ) : (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text type="secondary">{t("dashboard.noData")}</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

        {/* <Col xs={24} lg={24}>
        <Card
          title={t("dashboard.salesRevenue")}
          extra={
            <Text type="secondary">
              {period === "custom" && dateRange && dateRange.length === 2
                ? `${dateRange[0].format("MMM DD")} - ${dateRange[1].format(
                    "MMM DD, YYYY"
                  )}`
                : t(`dashboard.${period}`)}
            </Text>
          }
        >
          {salesData.length > 0 ? (
            <Column {...salesColumnConfig} height={300} />
          ) : (
            <div
              style={{
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text type="secondary">{t("dashboard.noData")}</Text>
            </div>
          )}
        </Card>
      </Col> */}

      {/* Data Tables Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={t("dashboard.recentOrders")}
            extra={
              <Button type="link" href="/orders">
                {t("dashboard.viewAll")}
              </Button>
            }
          >
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
              rowKey="id"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={t("dashboard.topProducts")}
            extra={<TrophyOutlined style={{ color: "#faad14" }} />}
          >
            <Table
              dataSource={topProducts}
              columns={topProductsColumns}
              pagination={false}
              size="small"
              showHeader={false}
              rowKey="id"
            />
          </Card>
        </Col>
      </Row>

      {/* Order Status Distribution and Alerts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t("dashboard.orderStatusDistribution")}>
            {stats.orderStatusDistribution &&
            stats.orderStatusDistribution.length > 0 ? (
              <Pie {...orderStatusConfig} height={300} />
            ) : (
              <div
                style={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text type="secondary">{t("dashboard.noData")}</Text>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={t("dashboard.inventoryAlerts")}
            extra={<WarningOutlined style={{ color: "#faad14" }} />}
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              {inventoryAlerts.length > 0 ? (
                inventoryAlerts.map((item, index) => (
                  <Alert
                    key={index}
                    message={item.name}
                    description={`${t("dashboard.stock")}: ${
                      t(`dashboard.stock_${item.stock_status}`) ||
                      item.stock_status
                    }`}
                    type={
                      item.stock_status === "out_of_stock" ? "error" : "warning"
                    }
                    showIcon
                    size="small"
                  />
                ))
              ) : (
                <Text type="secondary">{t("dashboard.noAlerts")}</Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <QuickNotificationFAB />
    </div>
  );
};

export default Dashboard;
