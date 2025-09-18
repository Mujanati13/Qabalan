import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  DollarCircleOutlined,
  ShopOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';

const StatisticsWidget = ({ stats, formatCurrency, formatCompactNumber, formatPercentage, t }) => {
  return (
    <Row gutter={[16, 16]}>
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
  );
};

export default StatisticsWidget;