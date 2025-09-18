import React, { createContext, useContext, useState, useEffect } from 'react';

const WidgetLayoutContext = createContext();

// Default widget layout configuration
const DEFAULT_LAYOUT = [
  {
    id: 'statistics',
    type: 'statistics',
    title: 'Statistics',
    position: { row: 0, span: 24 },
    visible: true,
    draggable: false, // Statistics should always be at top
  },
  {
    id: 'hot-orders',
    type: 'hot-orders',
    title: 'Hot Orders',
    position: { row: 1, span: 24 },
    visible: true,
    draggable: true,
  },
  {
    id: 'shipping-analytics',
    type: 'shipping-analytics',
    title: 'Shipping Analytics',
    position: { row: 2, span: 24 },
    visible: true,
    draggable: true,
  },
  {
    id: 'order-flow',
    type: 'order-flow',
    title: 'Order Flow Chart',
    position: { row: 3, span: 24 },
    visible: true,
    draggable: true,
  },
  {
    id: 'recent-orders',
    type: 'recent-orders',
    title: 'Recent Orders',
    position: { row: 4, span: 16 },
    visible: true,
    draggable: true,
  },
  {
    id: 'top-products',
    type: 'top-products',
    title: 'Top Products',
    position: { row: 4, span: 8 },
    visible: true,
    draggable: true,
  },
  {
    id: 'inventory-alerts',
    type: 'inventory-alerts',
    title: 'Inventory Alerts',
    position: { row: 5, span: 12 },
    visible: true,
    draggable: true,
  },
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Recent Notifications',
    position: { row: 5, span: 12 },
    visible: true,
    draggable: true,
  },
];

export const WidgetLayoutProvider = ({ children }) => {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [layoutChanged, setLayoutChanged] = useState(false);

  // Load layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-widget-layout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        // Merge with default layout to ensure all widgets exist
        const mergedLayout = DEFAULT_LAYOUT.map(defaultWidget => {
          const savedWidget = parsedLayout.find(w => w.id === defaultWidget.id);
          return savedWidget ? { ...defaultWidget, ...savedWidget } : defaultWidget;
        });
        setLayout(mergedLayout);
      } catch (error) {
        console.error('Error loading widget layout:', error);
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = (newLayout) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard-widget-layout', JSON.stringify(newLayout));
    setLayoutChanged(false);
  };

  // Toggle widget visibility
  const toggleWidgetVisibility = (widgetId) => {
    const newLayout = layout.map(widget =>
      widget.id === widgetId
        ? { ...widget, visible: !widget.visible }
        : widget
    );
    setLayout(newLayout);
    setLayoutChanged(true);
  };

  // Reorder widgets
  const reorderWidgets = (result) => {
    if (!result.destination) return;

    const items = Array.from(layout);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const newLayout = items.map((widget, index) => ({
      ...widget,
      position: { ...widget.position, row: index }
    }));

    setLayout(newLayout);
    setLayoutChanged(true);
  };

  // Reset to default layout
  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem('dashboard-widget-layout');
    setLayoutChanged(false);
  };

  // Get visible widgets in order
  const getVisibleWidgets = () => {
    return layout
      .filter(widget => widget.visible)
      .sort((a, b) => a.position.row - b.position.row);
  };

  // Get widget by ID
  const getWidget = (widgetId) => {
    return layout.find(widget => widget.id === widgetId);
  };

  const value = {
    layout,
    editMode,
    layoutChanged,
    setEditMode,
    saveLayout,
    toggleWidgetVisibility,
    reorderWidgets,
    resetLayout,
    getVisibleWidgets,
    getWidget,
  };

  return (
    <WidgetLayoutContext.Provider value={value}>
      {children}
    </WidgetLayoutContext.Provider>
  );
};

export const useWidgetLayout = () => {
  const context = useContext(WidgetLayoutContext);
  if (!context) {
    throw new Error('useWidgetLayout must be used within a WidgetLayoutProvider');
  }
  return context;
};

export default WidgetLayoutContext;