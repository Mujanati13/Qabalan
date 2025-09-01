import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Snackbar,
  Badge,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  InputAdornment,
  Tabs,
  Tab,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as EyeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  CreditCard as CreditCardIcon,
  Cancel as CancelIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccessTime as ClockIcon,
  LocationOn as LocationIcon,
  LocalShipping as TruckIcon,
  ShoppingCart as ShoppingCartIcon,
  MoreVert as MoreVertIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Add as AddIcon,
  FileDownload as ExportIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useExportConfig } from '../hooks/useExportConfig';
import { useTableSorting } from '../hooks/useTableSorting';
import { apiService } from '../services/apiService';
import io from 'socket.io-client';

// Styled components for better performance
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1),
  fontSize: '0.75rem',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
  height: 60,
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fff3cd', color: '#856404' };
      case 'confirmed': return { bg: '#d4edda', color: '#155724' };
      case 'preparing': return { bg: '#d1ecf1', color: '#0c5460' };
      case 'ready': return { bg: '#f8d7da', color: '#721c24' };
      case 'out_for_delivery': return { bg: '#e2e3e5', color: '#383d41' };
      case 'delivered': return { bg: '#d4edda', color: '#155724' };
      case 'cancelled': return { bg: '#f8d7da', color: '#721c24' };
      default: return { bg: '#e9ecef', color: '#495057' };
    }
  };
  
  const colors = getStatusColor(status);
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    fontSize: '0.7rem',
    height: 24,
    fontWeight: 600,
  };
});

const OrderItemsPreview = React.memo(({ items, formatPrice, maxItems = 2 }) => {
  if (!items || items.length === 0) {
    return <Typography variant="caption" color="textSecondary">No items</Typography>;
  }

  const displayItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  return (
    <Box sx={{ fontSize: '0.7rem' }}>
      {displayItems.map((item, index) => (
        <Box key={index} sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {item?.product_name || item?.product_title_en || 'Unknown'} x{item?.quantity || 0}
          </Typography>
        </Box>
      ))}
      {remainingCount > 0 && (
        <Typography variant="caption" color="textSecondary">
          +{remainingCount} more item{remainingCount > 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
});

const OrderItemCard = React.memo(({ item, formatPrice }) => {
  const productName = item?.product_name || 
                     item?.product_title_en || 
                     item?.product_title_ar || 
                     'Unknown Product';
  
  const unitPrice = Number(item?.unit_price || item?.price || 0);
  const quantity = Number(item?.quantity || 0);
  
  return (
    <Card sx={{ mb: 1, borderLeft: 3, borderLeftColor: 'primary.main' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8}>
            <Typography variant="body2" fontWeight="bold">
              {productName}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Unit Price: {formatPrice(unitPrice)}
            </Typography>
          </Grid>
          <Grid item xs={2} textAlign="center">
            <Typography variant="body2" fontWeight="bold">
              Qty: {quantity}
            </Typography>
          </Grid>
          <Grid item xs={2} textAlign="right">
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {formatPrice(unitPrice * quantity)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
});

const OrdersV2 = () => {
  const { t, language } = useLanguage();
  const { 
    pendingOrdersCount, 
    updatePendingCount, 
    refreshNotifications 
  } = useNotifications();
  const { getOrdersExportConfig } = useExportConfig();
  
  // Socket connection
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(
    localStorage.getItem('orderSoundEnabled') !== 'false'
  );
  
  // State management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [editOrderOpen, setEditOrderOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);
  
  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [selected, setSelected] = useState([]);
  const [orderBy, setOrderBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    order_type: 'all',
    payment_method: 'all',
    date_range: 'today',
    search: ''
  });
  
  const [orderStats, setOrderStats] = useState({});
  const [orderCounts, setOrderCounts] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRowForMenu, setSelectedRowForMenu] = useState(null);

  // Sound notification
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+DyvmwhBzmS1/LNeSsFJHfH8N+QQAoUXrPq66hVFApGn+Dyvmwh');
      audio.volume = 0.1;
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Sound notification failed');
    }
  }, [soundEnabled]);

  // Socket setup
  useEffect(() => {
    const connectSocket = () => {
      try {
        socketRef.current = io('http://localhost:3015', {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socketRef.current.on('connect', () => {
          setIsConnected(true);
          console.log('Socket connected for orders');
        });

        socketRef.current.on('disconnect', () => {
          setIsConnected(false);
          console.log('Socket disconnected');
        });

        socketRef.current.on('new_order', (orderData) => {
          console.log('New order received:', orderData);
          playNotificationSound();
          fetchOrders();
          updatePendingCount();
          setSnackbar({
            open: true,
            message: `New order #${orderData.id} received!`,
            severity: 'success'
          });
        });

        socketRef.current.on('order_updated', (orderData) => {
          console.log('Order updated:', orderData);
          fetchOrders();
          updatePendingCount();
        });

      } catch (error) {
        console.error('Socket connection error:', error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [playNotificationSound, updatePendingCount]);

  // Fetch data
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getOrders({
        ...filters,
        page: page + 1,
        limit: rowsPerPage,
        sortBy: orderBy,
        sortOrder: order
      });
      
      if (response.success) {
        setOrders(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch orders',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, rowsPerPage, orderBy, order]);

  const fetchOrderStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await apiService.getOrderStats(filters);
      if (response.success) {
        setOrderStats(response.data || {});
      }
    } catch (error) {
      console.error('Error fetching order stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [filters]);

  const fetchOrderCounts = useCallback(async () => {
    try {
      const response = await apiService.getOrderCounts();
      if (response.success) {
        setOrderCounts(response.data || {});
      }
    } catch (error) {
      console.error('Error fetching order counts:', error);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrderStats();
    fetchOrderCounts();
  }, [fetchOrderStats, fetchOrderCounts]);

  // Handlers
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = orders.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = async (order) => {
    setSelectedOrder(order);
    setDetailsLoading(true);
    setDetailsOpen(true);
    
    try {
      const response = await apiService.getOrderDetails(order.id);
      if (response.success) {
        setSelectedOrder(response.data);
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOrder || !selectedStatus) return;
    
    setStatusUpdateLoading(true);
    try {
      const response = await apiService.updateOrderStatus(selectedOrder.id, {
        status: selectedStatus,
        notes: statusNotes
      });
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: 'Order status updated successfully',
          severity: 'success'
        });
        setStatusUpdateOpen(false);
        setSelectedStatus('');
        setStatusNotes('');
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update order status',
        severity: 'error'
      });
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleQuickStatusUpdate = async (order, newStatus) => {
    try {
      const response = await apiService.updateOrderStatus(order.id, {
        status: newStatus
      });
      
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Order status updated to ${newStatus}`,
          severity: 'success'
        });
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update order status',
        severity: 'error'
      });
    }
  };

  const initiateCardPayment = async (order) => {
    setPaymentLoadingId(order.id);
    try {
      const response = await apiService.initiateCardPayment({
        orderId: order.id,
        amount: order.total_amount,
        currency: 'JOD'
      });
      
      if (response.success && response.data.hostedCheckoutUrl) {
        window.open(response.data.hostedCheckoutUrl, '_blank');
      }
    } catch (error) {
      console.error('Error initiating card payment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to initiate card payment',
        severity: 'error'
      });
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const handlePrintInvoice = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateInvoiceHTML(order));
    printWindow.document.close();
    printWindow.print();
  };

  const generateInvoiceHTML = (order) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .order-info { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Invoice</h1>
            <h2>Order #${order.id}</h2>
          </div>
          <div class="order-info">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Phone:</strong> ${order.customer_phone}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${order.order_status}</p>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${item.product_name || 'Unknown Product'}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit_price} JOD</td>
                  <td>${(item.quantity * item.unit_price).toFixed(2)} JOD</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total" style="margin-top: 20px; text-align: right;">
            <h3>Total: ${order.total_amount} JOD</h3>
          </div>
        </body>
      </html>
    `;
  };

  const formatPrice = (price) => {
    return `${Number(price || 0).toFixed(2)} JOD`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'preparing': return 'secondary';
      case 'ready': return 'error';
      case 'out_for_delivery': return 'default';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'pending': 'confirmed',
      'confirmed': 'preparing',
      'preparing': 'ready',
      'ready': 'out_for_delivery',
      'out_for_delivery': 'delivered'
    };
    return statusFlow[currentStatus];
  };

  const canAdvanceStatus = (status) => {
    return ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(status);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleMenuClick = (event, order) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowForMenu(order);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowForMenu(null);
  };

  const toggleSound = () => {
    const newSoundEnabled = !soundEnabled;
    setSoundEnabled(newSoundEnabled);
    localStorage.setItem('orderSoundEnabled', newSoundEnabled.toString());
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {t('orders.title') || 'Orders'}
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={soundEnabled}
                onChange={toggleSound}
                icon={<VolumeOffIcon />}
                checkedIcon={<VolumeUpIcon />}
              />
            }
            label="Sound"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOrderOpen(true)}
          >
            {t('orders.create_order') || 'Create Order'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchOrders();
              fetchOrderStats();
              fetchOrderCounts();
            }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(orderCounts).map(([status, count]) => (
          <Grid item xs={12} sm={6} md={3} key={status}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary">
                  {count}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t(`orders.${status}`) || status}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder={t('common.search') || 'Search...'}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.order_type}
                onChange={(e) => handleFilterChange('order_type', e.target.value)}
                label="Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="delivery">Delivery</MenuItem>
                <MenuItem value="pickup">Pickup</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment</InputLabel>
              <Select
                value={filters.payment_method}
                onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                label="Payment"
              >
                <MenuItem value="all">All Payment</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="card">Card</MenuItem>
                <MenuItem value="online">Online</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filters.date_range}
                onChange={(e) => handleFilterChange('date_range', e.target.value)}
                label="Date Range"
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="yesterday">Yesterday</MenuItem>
                <MenuItem value="this_week">This Week</MenuItem>
                <MenuItem value="this_month">This Month</MenuItem>
                <MenuItem value="all">All Time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={1}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Export">
                <IconButton>
                  <ExportIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Filter">
                <IconButton>
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">
              {selected.length} order{selected.length > 1 ? 's' : ''} selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" size="small">
                Bulk Update Status
              </Button>
              <Button variant="outlined" size="small">
                Export Selected
              </Button>
              <Button variant="outlined" size="small" color="error">
                Delete Selected
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {/* Orders Table */}
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <StyledTableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < orders.length}
                    checked={orders.length > 0 && selected.length === orders.length}
                    onChange={handleSelectAllClick}
                  />
                </StyledTableCell>
                <StyledTableCell>
                  <TableSortLabel
                    active={orderBy === 'id'}
                    direction={orderBy === 'id' ? order : 'asc'}
                    onClick={() => handleRequestSort('id')}
                  >
                    Order #
                  </TableSortLabel>
                </StyledTableCell>
                <StyledTableCell>
                  <TableSortLabel
                    active={orderBy === 'customer_name'}
                    direction={orderBy === 'customer_name' ? order : 'asc'}
                    onClick={() => handleRequestSort('customer_name')}
                  >
                    Customer
                  </TableSortLabel>
                </StyledTableCell>
                <StyledTableCell>
                  <TableSortLabel
                    active={orderBy === 'order_status'}
                    direction={orderBy === 'order_status' ? order : 'asc'}
                    onClick={() => handleRequestSort('order_status')}
                  >
                    Status
                  </TableSortLabel>
                </StyledTableCell>
                <StyledTableCell>Type</StyledTableCell>
                <StyledTableCell>
                  <TableSortLabel
                    active={orderBy === 'total_amount'}
                    direction={orderBy === 'total_amount' ? order : 'asc'}
                    onClick={() => handleRequestSort('total_amount')}
                  >
                    Total
                  </TableSortLabel>
                </StyledTableCell>
                <StyledTableCell>Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <StyledTableCell colSpan={7} align="center">
                    <CircularProgress />
                  </StyledTableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <StyledTableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary">
                      No orders found
                    </Typography>
                  </StyledTableCell>
                </TableRow>
              ) : (
                orders.map((order) => {
                  const isItemSelected = isSelected(order.id);
                  return (
                    <StyledTableRow
                      key={order.id}
                      hover
                      onClick={(event) => handleClick(event, order.id)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      selected={isItemSelected}
                    >
                      <StyledTableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                        />
                      </StyledTableCell>
                      <StyledTableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          #{order.id}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {order.customer_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(order.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 12 }} />
                            <Typography variant="caption">
                              {order.customer_phone}
                            </Typography>
                          </Box>
                          {order.customer_email && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <EmailIcon sx={{ fontSize: 12 }} />
                              <Typography variant="caption">
                                {order.customer_email}
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <ClockIcon sx={{ fontSize: 12 }} />
                            <Typography variant="caption" color="textSecondary">
                              {new Date(order.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Typography>
                          </Box>
                          {order.order_type === 'delivery' && order.delivery_address && (
                            <Box sx={{ mt: 0.5, p: 0.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <LocationIcon sx={{ fontSize: 12 }} />
                                <Typography variant="caption" fontWeight="bold">
                                  {order.delivery_address.full_name}
                                </Typography>
                              </Box>
                              <Typography variant="caption" display="block">
                                {order.delivery_address.address_line}
                              </Typography>
                              <Typography variant="caption" display="block">
                                {order.delivery_address.city}, {order.delivery_address.governorate}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <StatusChip
                            label={t(`orders.${order.order_status}`) || order.order_status}
                            status={order.order_status}
                            size="small"
                          />
                          {canAdvanceStatus(order.order_status) && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickStatusUpdate(order, getNextStatus(order.order_status));
                              }}
                              sx={{ fontSize: '0.6rem', py: 0.25 }}
                            >
                              → {getNextStatus(order.order_status)}
                            </Button>
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Chip
                          icon={order.order_type === 'delivery' ? <TruckIcon /> : <ShoppingCartIcon />}
                          label={t(`orders.${order.order_type}`) || order.order_type}
                          size="small"
                          color={order.order_type === 'delivery' ? 'primary' : 'success'}
                        />
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold" color="success.main">
                              {formatPrice(order.total_amount)}
                            </Typography>
                            <Badge badgeContent={order.items_count || 0} color="primary" />
                          </Box>
                          <Chip
                            label={`${order.payment_method === 'cash' ? '💵' : 
                                   order.payment_method === 'card' ? '💳' : 
                                   order.payment_method === 'online' ? '🌐' : '❓'} ${
                                   t(`orders.payment_${order.payment_method}`) || order.payment_method}`}
                            size="small"
                            color={
                              order.payment_method === 'cash' ? 'warning' : 
                              order.payment_method === 'card' ? 'secondary' : 
                              order.payment_method === 'online' ? 'info' : 'default'
                            }
                          />
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={`${order.payment_status === 'paid' ? '✓' : 
                                     order.payment_status === 'failed' ? '✗' : '⏳'} ${
                                     t(`orders.payment_status_${order.payment_status}`) || order.payment_status}`}
                              size="small"
                              color={
                                order.payment_status === 'paid' ? 'success' : 
                                order.payment_status === 'failed' ? 'error' : 'warning'
                              }
                            />
                          </Box>
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(order);
                              }}
                            >
                              <EyeIcon />
                            </IconButton>
                          </Tooltip>
                          {order.payment_status !== 'paid' && (
                            <Tooltip title="Pay with Card">
                              <IconButton
                                size="small"
                                color="secondary"
                                disabled={paymentLoadingId === order.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  initiateCardPayment(order);
                                }}
                              >
                                {paymentLoadingId === order.id ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <CreditCardIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Print Invoice">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintInvoice(order);
                              }}
                            >
                              <PrintIcon />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMenuClick(e, order);
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </StyledTableCell>
                    </StyledTableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100]}
          component="div"
          count={orders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setSelectedOrder(selectedRowForMenu);
          setStatusUpdateOpen(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Update Status</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setEditingOrder(selectedRowForMenu);
          setEditOrderOpen(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Order</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          // Handle cancel order
          handleMenuClose();
        }}>
          <ListItemIcon>
            <CancelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cancel Order</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          // Handle delete order
          handleMenuClose();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Order</ListItemText>
        </MenuItem>
      </Menu>

      {/* Order Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Order Details #{selectedOrder?.id}
        </DialogTitle>
        <DialogContent>
          {detailsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : selectedOrder ? (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Customer Information</Typography>
                  <Typography><strong>Name:</strong> {selectedOrder.customer_name}</Typography>
                  <Typography><strong>Phone:</strong> {selectedOrder.customer_phone}</Typography>
                  {selectedOrder.customer_email && (
                    <Typography><strong>Email:</strong> {selectedOrder.customer_email}</Typography>
                  )}
                  <Typography><strong>Status:</strong> {selectedOrder.order_status}</Typography>
                  <Typography><strong>Type:</strong> {selectedOrder.order_type}</Typography>
                  <Typography><strong>Payment:</strong> {selectedOrder.payment_method}</Typography>
                  <Typography><strong>Payment Status:</strong> {selectedOrder.payment_status}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Order Information</Typography>
                  <Typography><strong>Order Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</Typography>
                  <Typography><strong>Total Amount:</strong> {formatPrice(selectedOrder.total_amount)}</Typography>
                  {selectedOrder.delivery_address && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6" gutterBottom>Delivery Address</Typography>
                      <Typography>{selectedOrder.delivery_address.full_name}</Typography>
                      <Typography>{selectedOrder.delivery_address.address_line}</Typography>
                      <Typography>{selectedOrder.delivery_address.city}, {selectedOrder.delivery_address.governorate}</Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Order Items</Typography>
                  {selectedOrder.items && selectedOrder.items.map((item, index) => (
                    <OrderItemCard key={index} item={item} formatPrice={formatPrice} />
                  ))}
                </Grid>
              </Grid>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setDetailsOpen(false);
              setSelectedOrder(selectedOrder);
              setStatusUpdateOpen(true);
            }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={statusUpdateOpen}
        onClose={() => setStatusUpdateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Update Order Status
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>New Status</InputLabel>
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                label="New Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="out_for_delivery">Out for Delivery</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (Optional)"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Add any notes about this status update..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusUpdateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={!selectedStatus || statusUpdateLoading}
          >
            {statusUpdateLoading ? <CircularProgress size={20} /> : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrdersV2;
