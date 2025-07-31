import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  message,
  Tag,
  Tooltip,
  Row,
  Col,
  Statistic,
  Alert,
  Descriptions
} from 'antd';
import {
  CalculatorOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Option } = Select;

const ShippingCalculator = ({ 
  visible, 
  onCancel, 
  onCalculate,
  branches = [],
  addresses = [] 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calculation, setCalculation] = useState(null);

  const handleCalculate = async (values) => {
    try {
      setLoading(true);
      const response = await api.post('/shipping/calculate', {
        delivery_address_id: values.delivery_address_id,
        branch_id: values.branch_id,
        order_amount: values.order_amount || 0
      });
      
      const result = response.data.data;
      setCalculation(result);
      
      if (onCalculate) {
        onCalculate(result);
      }
      
      message.success('Shipping calculated successfully!');
    } catch (error) {
      message.error('Failed to calculate shipping cost');
      console.error('Calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <CalculatorOutlined />
          Jordan Shipping Calculator
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleCalculate}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="branch_id"
              label="Branch"
              rules={[{ required: true, message: 'Please select a branch' }]}
            >
              <Select placeholder="Select branch">
                {branches.map(branch => (
                  <Option key={branch.id} value={branch.id}>
                    {branch.title_en}
                    {branch.latitude && branch.longitude && (
                      <span style={{ color: '#666', fontSize: '12px' }}>
                        {` (${branch.latitude?.toFixed(4)}, ${branch.longitude?.toFixed(4)})`}
                      </span>
                    )}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="delivery_address_id"
              label="Delivery Address"
              rules={[{ required: true, message: 'Please enter address ID' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="Address ID"
                min={1}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="order_amount"
              label="Order Amount (JOD)"
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00"
                min={0}
                precision={2}
                addonAfter="JOD"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label=" ">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<CalculatorOutlined />}
                style={{ width: '100%' }}
              >
                Calculate Shipping
              </Button>
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {calculation && (
        <Card 
          title="🚚 Shipping Calculation Result" 
          style={{ marginTop: 16, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
        >
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Zone" span={1}>
              <Tag color="blue">{calculation.zone_name_en}</Tag>
              {calculation.zone_name_ar && (
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {calculation.zone_name_ar}
                </div>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Distance" span={1}>
              <Space>
                <EnvironmentOutlined />
                {calculation.distance_km?.toFixed(2)} km
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Base Cost" span={1}>
              <Space>
                <DollarOutlined />
                {calculation.base_cost?.toFixed(2)} JOD
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Distance Cost" span={1}>
              <Space>
                <ClockCircleOutlined />
                {calculation.distance_cost?.toFixed(2)} JOD
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Free Shipping" span={1}>
              {calculation.free_shipping_applied ? (
                <Tag color="green">YES - Free shipping applied!</Tag>
              ) : (
                <Tag color="orange">No (Order amount: {calculation.order_amount || 0} JOD)</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Final Cost" span={1}>
              <Tag color={calculation.free_shipping_applied ? 'green' : 'blue'} style={{ fontSize: '16px', padding: '4px 8px' }}>
                {calculation.total_shipping_cost?.toFixed(2)} JOD
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Calculation Method" span={2}>
              <Tag color="purple">{calculation.calculation_method}</Tag>
              {calculation.branch && (
                <span style={{ marginLeft: 8 }}>
                  via {calculation.branch.title_en}
                </span>
              )}
            </Descriptions.Item>
          </Descriptions>

          {calculation.free_shipping_threshold && !calculation.free_shipping_applied && (
            <Alert
              style={{ marginTop: 12 }}
              message={`Free shipping available with orders over ${calculation.free_shipping_threshold.toFixed(2)} JOD`}
              type="info"
              showIcon
            />
          )}
        </Card>
      )}
    </Modal>
  );
};

export default ShippingCalculator;
