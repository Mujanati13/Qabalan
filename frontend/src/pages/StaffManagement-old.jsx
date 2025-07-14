import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tabs,
  Row,
  Col,
  Badge,
  Avatar,
  Divider,
  message,
  Tooltip,
  Typography,
  Switch,
  Checkbox,
  Upload,
  Drawer,
  Popconfirm,
  Alert,
  Spin
} from 'antd';
import {
  UserAddOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlusOutlined,
  KeyOutlined,
  ShieldCheckOutlined,
  AuditOutlined,
  FilterOutlined
} from '@ant-design/icons';
import staffRoleService from '../services/staffRoleService';
import { useAuth } from '../hooks/useAuth';

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;
import staffRoleService from '../services/staffRoleService';

const StaffManagement = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openStaffDialog, setOpenStaffDialog] = useState(false);
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [staffForm, setStaffForm] = useState({
    email: '',
    phone: '',
    password: '',
    first_name: '',
    last_name: '',
    user_type: 'staff',
    employee_id: '',
    department: '',
    position: '',
    manager_id: '',
    hire_date: '',
    employment_type: 'full_time',
    salary: '',
    hourly_rate: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    roles: []
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: []
  });

  const [filters, setFilters] = useState({
    department: '',
    employment_type: '',
    is_active: '',
    search: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, rolesRes, deptRes, managersRes, statsRes] = await Promise.all([
        staffRoleService.getAllStaff(filters),
        staffRoleService.getAllRoles(),
        staffRoleService.getDepartments(),
        staffRoleService.getManagers(),
        staffRoleService.getStatistics()
      ]);

      setStaff(staffRes.data);
      setRoles(rolesRes.data);
      setDepartments(deptRes.data);
      setManagers(managersRes.data);
      setStatistics(statsRes.data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async () => {
    try {
      if (selectedStaff) {
        await staffRoleService.updateStaff(selectedStaff.id, staffForm);
        setSuccess('Staff member updated successfully');
      } else {
        await staffRoleService.createStaff(staffForm);
        setSuccess('Staff member created successfully');
      }
      setOpenStaffDialog(false);
      fetchData();
      resetStaffForm();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRoleSubmit = async () => {
    try {
      if (selectedRole) {
        await staffRoleService.updateRole(selectedRole.id, roleForm);
        setSuccess('Role updated successfully');
      } else {
        await staffRoleService.createRole(roleForm);
        setSuccess('Role created successfully');
      }
      setOpenRoleDialog(false);
      fetchData();
      resetRoleForm();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (window.confirm('Are you sure you want to deactivate this staff member?')) {
      try {
        await staffRoleService.deleteStaff(staffId);
        setSuccess('Staff member deactivated successfully');
        fetchData();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await staffRoleService.deleteRole(roleId);
        setSuccess('Role deleted successfully');
        fetchData();
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const openEditStaff = (staff) => {
    setSelectedStaff(staff);
    setStaffForm({
      email: staff.email || '',
      phone: staff.phone || '',
      password: '',
      first_name: staff.first_name || '',
      last_name: staff.last_name || '',
      user_type: staff.user_type || 'staff',
      employee_id: staff.employee_id || '',
      department: staff.department || '',
      position: staff.position || '',
      manager_id: staff.manager_id || '',
      hire_date: staff.hire_date || '',
      employment_type: staff.employment_type || 'full_time',
      salary: staff.salary || '',
      hourly_rate: staff.hourly_rate || '',
      emergency_contact_name: staff.emergency_contact_name || '',
      emergency_contact_phone: staff.emergency_contact_phone || '',
      notes: staff.notes || '',
      roles: staff.roles ? staff.roles.map(r => r.id) : []
    });
    setOpenStaffDialog(true);
  };

  const openEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name || '',
      display_name: role.display_name || '',
      description: role.description || '',
      permissions: role.permissions || []
    });
    setOpenRoleDialog(true);
  };

  const resetStaffForm = () => {
    setSelectedStaff(null);
    setStaffForm({
      email: '',
      phone: '',
      password: '',
      first_name: '',
      last_name: '',
      user_type: 'staff',
      employee_id: '',
      department: '',
      position: '',
      manager_id: '',
      hire_date: '',
      employment_type: 'full_time',
      salary: '',
      hourly_rate: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
      roles: []
    });
  };

  const resetRoleForm = () => {
    setSelectedRole(null);
    setRoleForm({
      name: '',
      display_name: '',
      description: '',
      permissions: []
    });
  };

  const handlePermissionChange = (module, permission, value) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.map(p => 
        p.module === module 
          ? { ...p, [permission]: value }
          : p
      )
    }));
  };

  const addModulePermission = (module) => {
    if (!roleForm.permissions.find(p => p.module === module)) {
      setRoleForm(prev => ({
        ...prev,
        permissions: [...prev.permissions, {
          module,
          can_read: false,
          can_create: false,
          can_update: false,
          can_delete: false,
          can_export: false,
          can_manage: false
        }]
      }));
    }
  };

  const removeModulePermission = (module) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => p.module !== module)
    }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Staff & Role Management
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Staff
                </Typography>
                <Typography variant="h5">
                  {statistics.total_staff}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Staff
                </Typography>
                <Typography variant="h5" color="success.main">
                  {statistics.active_staff}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Administrators
                </Typography>
                <Typography variant="h5">
                  {statistics.admin_count}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Full Time
                </Typography>
                <Typography variant="h5">
                  {statistics.full_time}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Part Time
                </Typography>
                <Typography variant="h5">
                  {statistics.part_time}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Contractors
                </Typography>
                <Typography variant="h5">
                  {statistics.contract}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab icon={<Group />} label="Staff Members" />
          <Tab icon={<Security />} label="Roles & Permissions" />
        </Tabs>
      </Card>

      {/* Staff Management Tab */}
      {currentTab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">Staff Members</Typography>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => {
                  resetStaffForm();
                  setOpenStaffDialog(true);
                }}
              >
                Add Staff Member
              </Button>
            </Box>

            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Search"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: <Search />
                  }}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filters.department}
                    onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {departments.map(dept => (
                      <MenuItem key={dept.department} value={dept.department}>
                        {dept.department}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Employment Type</InputLabel>
                  <Select
                    value={filters.employment_type}
                    onChange={(e) => setFilters(prev => ({ ...prev, employment_type: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    {staffRoleService.getEmploymentTypes().map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.is_active}
                    onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchData}
                  fullWidth
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>

            {/* Staff Table */}
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Staff Member</TableCell>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Position</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Roles</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {staff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2 }}>
                              {member.first_name?.charAt(0)}{member.last_name?.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {member.full_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {member.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{member.employee_id || 'N/A'}</TableCell>
                        <TableCell>{member.department || 'N/A'}</TableCell>
                        <TableCell>{member.position || 'N/A'}</TableCell>
                        <TableCell>
                          <Chip
                            label={staffRoleService.getUserTypeLabel(member.user_type)}
                            color={member.user_type === 'admin' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.is_active ? 'Active' : 'Inactive'}
                            color={member.is_active ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {member.roles || 'No roles'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => openEditStaff(member)}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteStaff(member.id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Roles Management Tab */}
      {currentTab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Roles & Permissions</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  resetRoleForm();
                  setOpenRoleDialog(true);
                }}
              >
                Create Role
              </Button>
            </Box>

            {/* Roles Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Role Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>System Role</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {role.display_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {role.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>{role.user_count}</TableCell>
                      <TableCell>
                        <Chip
                          label={role.is_system_role ? 'System' : 'Custom'}
                          color={role.is_system_role ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View/Edit">
                            <IconButton
                              size="small"
                              onClick={() => openEditRole(role)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          {!role.is_system_role && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteRole(role.id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Staff Dialog */}
      <Dialog open={openStaffDialog} onClose={() => setOpenStaffDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedStaff ? 'Edit Staff Member' : 'Add Staff Member'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                value={staffForm.email}
                onChange={(e) => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                fullWidth
                required
                disabled={selectedStaff}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone"
                value={staffForm.phone}
                onChange={(e) => setStaffForm(prev => ({ ...prev, phone: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={staffForm.first_name}
                onChange={(e) => setStaffForm(prev => ({ ...prev, first_name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={staffForm.last_name}
                onChange={(e) => setStaffForm(prev => ({ ...prev, last_name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            {!selectedStaff && (
              <Grid item xs={12}>
                <TextField
                  label="Password"
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, password: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>User Type</InputLabel>
                <Select
                  value={staffForm.user_type}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, user_type: e.target.value }))}
                >
                  {staffRoleService.getUserTypes().map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Employee ID"
                value={staffForm.employee_id}
                onChange={(e) => setStaffForm(prev => ({ ...prev, employee_id: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Department"
                value={staffForm.department}
                onChange={(e) => setStaffForm(prev => ({ ...prev, department: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Position"
                value={staffForm.position}
                onChange={(e) => setStaffForm(prev => ({ ...prev, position: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Manager</InputLabel>
                <Select
                  value={staffForm.manager_id}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, manager_id: e.target.value }))}
                >
                  <MenuItem value="">No Manager</MenuItem>
                  {managers.map(manager => (
                    <MenuItem key={manager.id} value={manager.id}>
                      {manager.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select
                  value={staffForm.employment_type}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, employment_type: e.target.value }))}
                >
                  {staffRoleService.getEmploymentTypes().map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Hire Date"
                type="date"
                value={staffForm.hire_date}
                onChange={(e) => setStaffForm(prev => ({ ...prev, hire_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Salary"
                type="number"
                value={staffForm.salary}
                onChange={(e) => setStaffForm(prev => ({ ...prev, salary: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Hourly Rate"
                type="number"
                value={staffForm.hourly_rate}
                onChange={(e) => setStaffForm(prev => ({ ...prev, hourly_rate: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Name"
                value={staffForm.emergency_contact_name}
                onChange={(e) => setStaffForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Phone"
                value={staffForm.emergency_contact_phone}
                onChange={(e) => setStaffForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                value={staffForm.notes}
                onChange={(e) => setStaffForm(prev => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={staffForm.roles}
                  onChange={(e) => setStaffForm(prev => ({ ...prev, roles: e.target.value }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const role = roles.find(r => r.id === value);
                        return (
                          <Chip key={value} label={role?.display_name} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      {role.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStaffDialog(false)}>Cancel</Button>
          <Button onClick={handleStaffSubmit} variant="contained">
            {selectedStaff ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={openRoleDialog} onClose={() => setOpenRoleDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {selectedRole ? 'Edit Role' : 'Create Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Role Name (Key)"
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
                disabled={selectedRole?.is_system_role}
                helperText="Lowercase, underscore-separated (e.g., sales_manager)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Display Name"
                value={roleForm.display_name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, display_name: e.target.value }))}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Permissions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {/* Add Module */}
              <Box mb={2}>
                <FormControl sx={{ minWidth: 200, mr: 2 }}>
                  <InputLabel>Add Module</InputLabel>
                  <Select
                    onChange={(e) => addModulePermission(e.target.value)}
                    value=""
                  >
                    {staffRoleService.getAvailableModules()
                      .filter(module => !roleForm.permissions.find(p => p.module === module.value))
                      .map(module => (
                        <MenuItem key={module.value} value={module.value}>
                          {module.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Permissions Table */}
              {roleForm.permissions.length > 0 && (
                <TableContainer component={Paper} sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Module</TableCell>
                        <TableCell>Read</TableCell>
                        <TableCell>Create</TableCell>
                        <TableCell>Update</TableCell>
                        <TableCell>Delete</TableCell>
                        <TableCell>Export</TableCell>
                        <TableCell>Manage</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roleForm.permissions.map((perm) => (
                        <TableRow key={perm.module}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {staffRoleService.getModuleLabel(perm.module)}
                            </Typography>
                          </TableCell>
                          {['can_read', 'can_create', 'can_update', 'can_delete', 'can_export', 'can_manage'].map(permission => (
                            <TableCell key={permission}>
                              <Checkbox
                                checked={perm[permission] || false}
                                onChange={(e) => handlePermissionChange(perm.module, permission, e.target.checked)}
                                disabled={selectedRole?.is_system_role}
                              />
                            </TableCell>
                          ))}
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => removeModulePermission(perm.module)}
                              color="error"
                              disabled={selectedRole?.is_system_role}
                            >
                              <Delete />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRoleDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleRoleSubmit} 
            variant="contained"
            disabled={selectedRole?.is_system_role}
          >
            {selectedRole ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StaffManagement;
