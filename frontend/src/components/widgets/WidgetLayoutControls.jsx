import React, { useState } from 'react';
import { 
  Button, 
  Space, 
  Modal, 
  List, 
  Switch, 
  Typography, 
  message,
  Divider,
  Alert
} from 'antd';
import {
  SettingOutlined,
  DragOutlined,
  SaveOutlined,
  ReloadOutlined,
  EyeOutlined,
  CloseOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useWidgetLayout } from '../../contexts/WidgetLayoutContext';

const { Title, Text } = Typography;

const WidgetLayoutControls = () => {
  const {
    layout,
    editMode,
    layoutChanged,
    setEditMode,
    saveLayout,
    toggleWidgetVisibility,
    resetLayout,
  } = useWidgetLayout();

  const [settingsVisible, setSettingsVisible] = React.useState(false);

  const handleToggleEditMode = () => {
    if (editMode && layoutChanged) {
      Modal.confirm({
        title: 'Save Changes?',
        content: 'You have unsaved layout changes. Do you want to save them?',
        okText: 'Save & Exit',
        cancelText: 'Discard & Exit',
        onOk: () => {
          saveLayout(layout);
          setEditMode(false);
          message.success('Widget layout saved successfully!');
        },
        onCancel: () => {
          setEditMode(false);
          window.location.reload(); // Reload to revert changes
        }
      });
    } else {
      setEditMode(!editMode);
      if (!editMode) {
        message.info('Widget edit mode enabled. Drag widgets to rearrange them.');
      }
    }
  };

  const handleSaveLayout = () => {
    saveLayout(layout);
    message.success('Widget layout saved successfully!');
  };

  const handleResetLayout = () => {
    Modal.confirm({
      title: 'Reset Widget Layout?',
      content: 'This will restore the default widget layout. All customizations will be lost.',
      okText: 'Reset',
      okType: 'danger',
      onOk: () => {
        resetLayout();
        message.success('Widget layout reset to default!');
      }
    });
  };

  const draggableWidgets = layout.filter(widget => widget.draggable);
  const visibleCount = layout.filter(widget => widget.visible).length;

  return (
    <>
      <Space>
        <Button
          type={editMode ? 'primary' : 'default'}
          icon={editMode ? <CloseOutlined /> : <DragOutlined />}
          onClick={handleToggleEditMode}
          style={{
            background: editMode ? '#ff4d4f' : undefined,
            borderColor: editMode ? '#ff4d4f' : undefined,
          }}
        >
          {editMode ? 'Exit Edit' : 'Customize Layout'}
        </Button>

        {editMode && (
          <>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveLayout}
              disabled={!layoutChanged}
            >
              Save Layout
            </Button>

            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              Widget Settings
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetLayout}
              danger
            >
              Reset Layout
            </Button>
          </>
        )}
      </Space>

      <Modal
        title={
          <Space>
            <SettingOutlined />
            Dashboard Widget Settings
          </Space>
        }
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setSettingsVisible(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        <Alert
          message="Widget Visibility Control"
          description={`${visibleCount} of ${layout.length} widgets are currently visible. Toggle widgets on/off to customize your dashboard.`}
          type="info"
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />

        <Divider>Available Widgets</Divider>

        <List
          itemLayout="horizontal"
          dataSource={layout}
          renderItem={(widget) => (
            <List.Item
              actions={[
                <Switch
                  key="visibility"
                  checked={widget.visible}
                  onChange={() => toggleWidgetVisibility(widget.id)}
                  checkedChildren={<EyeOutlined />}
                  unCheckedChildren={<EyeOutlined />}
                />
              ]}
            >
              <List.Item.Meta
                avatar={
                  widget.draggable ? (
                    <DragOutlined style={{ color: '#1890ff' }} />
                  ) : (
                    <div style={{ 
                      width: 14, 
                      height: 14, 
                      backgroundColor: '#f0f0f0', 
                      borderRadius: '50%' 
                    }} />
                  )
                }
                title={
                  <Space>
                    <span>{widget.title}</span>
                    {!widget.draggable && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        (Fixed Position)
                      </Text>
                    )}
                  </Space>
                }
                description={
                  <Text type="secondary">
                    {widget.draggable 
                      ? 'Draggable widget - can be reordered'
                      : 'Fixed widget - always stays in this position'
                    }
                  </Text>
                }
              />
            </List.Item>
          )}
        />

        <Divider />

        <Space direction="vertical" style={{ width: '100%' }}>
          <Text strong>Layout Statistics:</Text>
          <Space split={<Divider type="vertical" />}>
            <Text>Total Widgets: {layout.length}</Text>
            <Text>Visible: {visibleCount}</Text>
            <Text>Draggable: {draggableWidgets.length}</Text>
            <Text>Fixed: {layout.length - draggableWidgets.length}</Text>
          </Space>
        </Space>
      </Modal>
    </>
  );
};

export default WidgetLayoutControls;