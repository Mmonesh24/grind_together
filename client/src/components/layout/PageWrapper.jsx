import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useUiStore from '../../store/uiStore';
import './PageWrapper.css';

export default function PageWrapper() {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="page-wrapper">
      <Sidebar />
      <main className={`page-wrapper__content ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <Outlet />
      </main>
    </div>
  );
}
