import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../api';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineMail, HiOutlineOfficeBuilding, HiOutlinePlus } from 'react-icons/hi';

export default function AdminEmployees() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'employees', 'list'],
    queryFn: () => adminApi.getEmployees(),
  });

  const colors = [
    'from-primary-500 to-primary-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
    'from-rose-500 to-rose-600',
    'from-violet-500 to-violet-600',
    'from-cyan-500 to-cyan-600',
  ];

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Employees</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {data ? `${data.employees.length} registered employees` : 'All registered employees in the system'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/employees/add')}
          className="btn-primary flex items-center gap-2"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Add Employee
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary-100 border-t-primary-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.employees.map((emp, i) => {
            const initials = emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            const color = colors[i % colors.length];
            return (
              <div key={emp._id} className={`stagger-${(i % 5) + 1} card hover:shadow-lg transition-all hover:-translate-y-0.5 group`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white text-sm font-bold shadow-lg shadow-gray-200/50`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">{emp.name}</h3>
                    <div className="mt-2.5 space-y-1.5">
                      <p className="flex items-center gap-2 text-sm text-gray-500 truncate">
                        <HiOutlineMail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        {emp.email}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-gray-500">
                        <HiOutlineOfficeBuilding className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <span className="badge-neutral">{emp.department}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {data?.employees.length === 0 && (
            <div className="col-span-full flex flex-col items-center py-16 text-gray-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
                <HiOutlineUsers className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-medium text-gray-500">No employees found</p>
              <p className="mt-1 text-sm">Add your first employee to get started</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
