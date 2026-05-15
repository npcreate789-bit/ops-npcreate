import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../shared/auth/RequireAuth'
import { RequireModuleAccess } from '../shared/auth/RequireModuleAccess'
import { AppLayout } from './layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { CrmLeadsPage } from './modules/crm/pages/CrmLeadsPage'
import { LeadEditorPage } from './modules/crm/pages/LeadEditorPage'
import { SalesPage } from './modules/sales/pages/SalesPage'
import { QuotationEditorPage } from './modules/sales/pages/QuotationEditorPage'
import { FinancePage } from './modules/finance/pages/FinancePage'
import { PaymentEditorPage } from './modules/finance/pages/PaymentEditorPage'
import { OnboardingListPage } from './modules/onboarding/pages/OnboardingListPage'
import { OnboardingDetailPage } from './modules/onboarding/pages/OnboardingDetailPage'
import { AdsListPage } from './modules/ads/pages/AdsListPage'
import { AdsReportPage } from './modules/ads/pages/AdsReportPage'
import { TasksPage } from './modules/tasks/pages/TasksPage'
import { TaskEditorPage } from './modules/tasks/pages/TaskEditorPage'
import { DashboardPage } from './modules/dashboard/pages/DashboardPage'
import { AdminAuditPage } from './modules/admin/pages/AdminAuditPage'
import { AdminUsersPage } from './modules/admin/pages/AdminUsersPage'
import { ContentListPage } from './modules/content/pages/ContentListPage'
import { ContentJobEditorPage } from './modules/content/pages/ContentJobEditorPage'
import { ClientPortalPage } from './modules/client/pages/ClientPortalPage'
import { NotificationsPage } from './modules/notifications/pages/NotificationsPage'
import { CreatorsListPage } from './modules/creators/pages/CreatorsListPage'
import { CreatorEditorPage } from './modules/creators/pages/CreatorEditorPage'
import { RenewalsPage } from './modules/renewals/pages/RenewalsPage'
import { ReportsPage } from './modules/reports/pages/ReportsPage'
import { AssistantPage } from './modules/assistant/pages/AssistantPage'
import { TimelinePage } from './modules/timeline/pages/TimelinePage'
import { SettingsPage } from './modules/settings/pages/SettingsPage'

function Module({ path, element }: { path: string; element: ReactNode }) {
  return (
    <RequireModuleAccess navPath={path}>
      {element}
    </RequireModuleAccess>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="crm" element={<Module path="/app/crm" element={<CrmLeadsPage />} />} />
        <Route path="crm/:id" element={<Module path="/app/crm" element={<LeadEditorPage />} />} />
        <Route path="sales" element={<Module path="/app/sales" element={<SalesPage />} />} />
        <Route
          path="sales/quotations/:id"
          element={<Module path="/app/sales" element={<QuotationEditorPage />} />}
        />
        <Route path="finance" element={<Module path="/app/finance" element={<FinancePage />} />} />
        <Route
          path="finance/payments/:id"
          element={<Module path="/app/finance" element={<PaymentEditorPage />} />}
        />
        <Route
          path="onboarding"
          element={<Module path="/app/onboarding" element={<OnboardingListPage />} />}
        />
        <Route
          path="onboarding/:customerId"
          element={<Module path="/app/onboarding" element={<OnboardingDetailPage />} />}
        />
        <Route path="ads" element={<Module path="/app/ads" element={<AdsListPage />} />} />
        <Route path="ads/:customerId" element={<Module path="/app/ads" element={<AdsReportPage />} />} />
        <Route path="tasks" element={<Module path="/app/tasks" element={<TasksPage />} />} />
        <Route path="tasks/:id" element={<Module path="/app/tasks" element={<TaskEditorPage />} />} />
        <Route
          path="dashboard"
          element={<Module path="/app/dashboard" element={<DashboardPage />} />}
        />
        <Route path="admin" element={<Module path="/app/admin" element={<AdminUsersPage />} />} />
        <Route path="admin/logs" element={<Module path="/app/admin" element={<AdminAuditPage />} />} />
        <Route path="content" element={<Module path="/app/content" element={<ContentListPage />} />} />
        <Route
          path="content/:id"
          element={<Module path="/app/content" element={<ContentJobEditorPage />} />}
        />
        <Route path="client" element={<Module path="/app/client" element={<ClientPortalPage />} />} />
        <Route
          path="notifications"
          element={<Module path="/app/notifications" element={<NotificationsPage />} />}
        />
        <Route path="creators" element={<Module path="/app/creators" element={<CreatorsListPage />} />} />
        <Route
          path="creators/:id"
          element={<Module path="/app/creators" element={<CreatorEditorPage />} />}
        />
        <Route path="renewals" element={<Module path="/app/renewals" element={<RenewalsPage />} />} />
        <Route path="reports" element={<Module path="/app/reports" element={<ReportsPage />} />} />
        <Route path="assistant" element={<Module path="/app/assistant" element={<AssistantPage />} />} />
        <Route path="timeline" element={<Module path="/app/timeline" element={<TimelinePage />} />} />
        <Route path="settings" element={<Module path="/app/settings" element={<SettingsPage />} />} />
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
