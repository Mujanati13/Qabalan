import React from 'react';
import { Card, Button, Space, Tooltip } from 'antd';
import { 
  DragOutlined, 
  EyeOutlined, 
  EyeInvisibleOutlined,
  SettingOutlined 
} from '@ant-design/icons';
import { Draggable } from 'react-beautiful-dnd';
import { useWidgetLayout } from '../../contexts/WidgetLayoutContext';

const DraggableWidget = ({ 
  widget, 
  index, 
  children, 
  title, 
  extra, 
  ...cardProps 
}) => {
  const { editMode, toggleWidgetVisibility } = useWidgetLayout();

  const handleToggleVisibility = (e) => {
    e.stopPropagation();
    toggleWidgetVisibility(widget.id);
  };

  const cardTitle = (
    <Space>
      {editMode && widget.draggable && (
        <DragOutlined 
          style={{ 
            color: '#1890ff', 
            cursor: 'grab',
            fontSize: '16px'
          }} 
        />
      )}
      <span>{title || widget.title}</span>
    </Space>
  );

  const cardExtra = (
    <Space>
      {extra}
      {editMode && (
        <Tooltip title={widget.visible ? 'Hide Widget' : 'Show Widget'}>
          <Button
            type="text"
            size="small"
            icon={widget.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={handleToggleVisibility}
            style={{ 
              color: widget.visible ? '#52c41a' : '#8c8c8c' 
            }}
          />
        </Tooltip>
      )}
    </Space>
  );

  if (!widget.visible && !editMode) {
    return null;
  }

  const cardContent = (
    <Card
      title={cardTitle}
      extra={cardExtra}
      style={{
        marginBottom: 16,
        opacity: widget.visible ? 1 : 0.5,
        border: editMode ? '2px dashed #1890ff' : undefined,
        transition: 'all 0.3s ease',
        ...cardProps.style
      }}
      {...cardProps}
    >
      {children}
    </Card>
  );

  if (!editMode || !widget.draggable) {
    return (
      <div
        style={{
          opacity: widget.visible ? 1 : 0.5,
          transition: 'opacity 0.3s ease'
        }}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Draggable draggableId={widget.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            opacity: widget.visible ? 1 : 0.5,
            transform: snapshot.isDragging 
              ? `${provided.draggableProps.style?.transform} rotate(5deg)` 
              : provided.draggableProps.style?.transform,
            transition: snapshot.isDragging ? 'none' : 'all 0.3s ease',
            zIndex: snapshot.isDragging ? 1000 : 'auto',
          }}
        >
          <Card
            title={cardTitle}
            extra={cardExtra}
            style={{
              marginBottom: 16,
              border: '2px dashed #1890ff',
              boxShadow: snapshot.isDragging 
                ? '0 10px 20px rgba(0,0,0,0.2)' 
                : '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'grab',
              ...cardProps.style
            }}
            {...cardProps}
          >
            {children}
          </Card>
        </div>
      )}
    </Draggable>
  );
};

export default DraggableWidget;