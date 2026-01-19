'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Calendar, Eye, EyeOff, Clock } from 'lucide-react';
import { EmployeeAllocationsDialog } from '@/components/employee-allocations-dialog';
import { getBrandFeatures, type BrandFeatures } from '@/lib/brand-features';
import { useHelp } from '@/lib/help-context';
import { HelpArea } from '@/components/help-area';

interface Employee {
  id: number;
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  role: string;
  group_id?: number;
  date_of_hire?: string;
  rehire_date?: string;
  employment_type?: string;
  seniority_rank?: number;
  created_by?: number;
  is_active: number;
}

interface Group {
  id: number;
  name: string;
  description: string;
}

export default function UsersPage() {
  const { user, isAuthenticated, isLoading: authLoading, token } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [allocationsDialogOpen, setAllocationsDialogOpen] = useState(false);
  const [selectedEmployeeForAllocations, setSelectedEmployeeForAllocations] = useState<Employee | null>(null);
  const [brandFeatures, setBrandFeatures] = useState<BrandFeatures | null>(null);

  // Check if leave management is enabled for this brand
  const leaveManagementEnabled = brandFeatures?.features?.leaveManagement?.enabled ?? false;

  // Set the current screen for help context
  const { setCurrentScreen } = useHelp();
  useEffect(() => {
    setCurrentScreen('employees');
  }, [setCurrentScreen]);

  const [formData, setFormData] = useState({
    employee_number: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'employee',
    group_id: '',
    date_of_hire: '',
    rehire_date: '',
    employment_type: 'full_time',
    seniority_rank: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load brand features on mount
  useEffect(() => {
    getBrandFeatures().then(setBrandFeatures);
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadEmployees();
      loadGroups();
    }
  }, [isAuthenticated, token, showInactive]);

  const loadEmployees = async () => {
    try {
      const url = showInactive ? '/api/employees?includeInactive=true' : '/api/employees';
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/groups', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleOpenAllocationsDialog = (employee: Employee) => {
    setSelectedEmployeeForAllocations(employee);
    setAllocationsDialogOpen(true);
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        employee_number: employee.employee_number || '',
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || '',
        role: employee.role,
        group_id: employee.group_id?.toString() || '',
        date_of_hire: employee.date_of_hire || '',
        rehire_date: employee.rehire_date || '',
        employment_type: employee.employment_type || 'full_time',
        seniority_rank: employee.seniority_rank?.toString() || '',
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        employee_number: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'employee',
        group_id: '',
        date_of_hire: '',
        rehire_date: '',
        employment_type: 'full_time',
        seniority_rank: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      group_id: formData.group_id ? parseInt(formData.group_id) : null,
      date_of_hire: formData.date_of_hire || null,
      rehire_date: formData.rehire_date || null,
      employment_type: formData.employment_type || 'full_time',
      seniority_rank: formData.seniority_rank ? parseInt(formData.seniority_rank) : null,
    };

    try {
      if (editingEmployee) {
        // Update employee
        const response = await fetch('/api/employees', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: editingEmployee.id,
            ...payload,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update employee');
        }
      } else {
        // Create employee
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to create employee');
        }
      }

      handleCloseDialog();
      loadEmployees();
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert('Failed to save employee');
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.first_name} ${employee.last_name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/employees?id=${employee.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete employee');
      }

      loadEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      alert('Failed to delete employee');
    }
  };

  // Check if current user can edit a given employee
  const canEditEmployee = (employee: Employee): boolean => {
    if (!user || !user.group) return false;

    // Master group can edit all
    if (user.group.is_master) return true;

    // Users with can_edit_all permission can edit all
    if (user.group.can_edit_all) return true;

    // Users can edit employees in their own group
    if (employee.group_id && employee.group_id === user.group_id) return true;

    // Otherwise, no permission
    return false;
  };

  // Check if current user can delete a given employee
  const canDeleteEmployee = (employee: Employee): boolean => {
    if (!user || !user.group) return false;

    // Master users can delete any employee
    if (user.group.is_master) return true;

    // Creator can delete their own employees
    if (employee.created_by && employee.created_by === user.id) return true;

    // Users with can_edit_all permission can delete all
    if (user.group.can_edit_all) return true;

    // Users can delete employees in their own group (if they have edit permission)
    if (employee.group_id && employee.group_id === user.group_id) return true;

    return false;
  };

  // Check if current user can create new employees
  const canCreateEmployee = (): boolean => {
    if (!user || !user.group) return false;

    // Master group can create employees
    if (user.group.is_master) return true;

    // Users with can_edit_all permission can create employees
    if (user.group.can_edit_all) return true;

    // Regular users can create employees in their own group
    // This is a more permissive option - uncomment if desired:
    // return true;

    // By default, only Master and can_edit_all users can create
    return false;
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">Manage employee records and information</p>
        </div>
        <div className="flex gap-2">
          {user?.group?.is_master && (
            <Button
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
              className="gap-2"
            >
              {showInactive ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Inactive
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Inactive
                </>
              )}
            </Button>
          )}
          {canCreateEmployee() && (
            <HelpArea helpId="add-employee" bubblePosition="left">
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            </HelpArea>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Group</TableHead>
              {leaveManagementEnabled && <TableHead>Employment</TableHead>}
              <TableHead>Date of Hire</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={leaveManagementEnabled ? 8 : 7} className="text-center text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  className={employee.is_active === 0 ? 'opacity-50 bg-muted/30' : ''}
                >
                  <TableCell className="font-mono">
                    {employee.employee_number || '-'}
                    {employee.is_active === 0 && (
                      <span className="ml-2 text-xs text-muted-foreground italic">(Inactive)</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {employee.first_name} {employee.last_name}
                  </TableCell>
                  <TableCell>{employee.email || '-'}</TableCell>
                  <TableCell className="capitalize">{employee.role}</TableCell>
                  <TableCell>
                    {employee.group_id
                      ? groups.find((g) => g.id === employee.group_id)?.name || '-'
                      : '-'}
                  </TableCell>
                  {leaveManagementEnabled && (
                    <TableCell className="capitalize">
                      {employee.employment_type?.replace('_', '-') || 'Full-time'}
                    </TableCell>
                  )}
                  <TableCell>
                    {employee.date_of_hire
                      ? new Date(employee.date_of_hire).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEditEmployee(employee) && employee.is_active === 1 && (
                        <HelpArea helpId="edit-employee" bubblePosition="left" showHighlight={false}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(employee)}
                            title="Edit Employee"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </HelpArea>
                      )}
                      {canEditEmployee(employee) && employee.is_active === 1 && (
                        <HelpArea helpId="allocations" bubblePosition="left" showHighlight={false}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAllocationsDialog(employee)}
                            title="Manage Time Allocations"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </HelpArea>
                      )}
                      {canDeleteEmployee(employee) && employee.is_active === 1 && (
                        <HelpArea helpId="delete-employee" bubblePosition="left" showHighlight={false}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(employee)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </HelpArea>
                      )}
                      {employee.is_active === 0 && (
                        <span className="text-xs text-muted-foreground italic">Deleted</span>
                      )}
                      {employee.is_active === 1 && !canEditEmployee(employee) && !canDeleteEmployee(employee) && (
                        <span className="text-xs text-muted-foreground italic">No access</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Edit Employee' : 'Add Employee'}
            </DialogTitle>
            <DialogDescription>
              {editingEmployee
                ? 'Update employee information below.'
                : 'Enter employee information below.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_number">Employee Number</Label>
                <Input
                  id="employee_number"
                  value={formData.employee_number}
                  onChange={(e) =>
                    setFormData({ ...formData, employee_number: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group_id">Group</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, group_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Job Title</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="hr">HR Specialist</SelectItem>
                    <SelectItem value="accountant">Accountant</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="assistant">Assistant</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_hire">Date of Hire</Label>
                <Input
                  id="date_of_hire"
                  type="date"
                  value={formData.date_of_hire}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_hire: e.target.value })
                  }
                />
              </div>
            </div>

            {leaveManagementEnabled && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, employment_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rehire_date">Rehire Date</Label>
                  <Input
                    id="rehire_date"
                    type="date"
                    value={formData.rehire_date}
                    onChange={(e) =>
                      setFormData({ ...formData, rehire_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seniority_rank">Seniority Rank (1-5)</Label>
                  <Input
                    id="seniority_rank"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.seniority_rank}
                    onChange={(e) =>
                      setFormData({ ...formData, seniority_rank: e.target.value })
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit">
                {editingEmployee ? 'Update' : 'Create'} Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selectedEmployeeForAllocations && (
        <EmployeeAllocationsDialog
          open={allocationsDialogOpen}
          onOpenChange={setAllocationsDialogOpen}
          employeeId={selectedEmployeeForAllocations.id}
          employeeName={`${selectedEmployeeForAllocations.first_name} ${selectedEmployeeForAllocations.last_name}`}
        />
      )}
    </div>
  );
}
