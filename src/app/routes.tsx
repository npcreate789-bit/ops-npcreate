import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../shared/auth/RequireAuth'
import { RequireModuleAccess } from '../shared/auth/RequireModuleAccess'
import { AppLayout } from './layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RootRedirect } from './pages/RootRedirect'
import { SetPasswordPage } from './pages/SetPasswordPage'
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
import { ClientWorkspaceLayout } from './modules/client/layout/ClientWorkspaceLayout'
import { ClientBriefPage } from './modules/client/pages/ClientBriefPage'
import { ClientChatPage } from './modules/client/pages/ClientChatPage'
import { ClientDashboardPage } from './modules/client/pages/ClientDashboardPage'
import { ClientPaymentPage } from './modules/client/pages/ClientPaymentPage'
import { ClientProjectsPage } from './modules/client/pages/ClientProjectsPage'
import { ClientReportsPage } from './modules/client/pages/ClientReportsPage'
import { ContactPage } from './modules/contact/pages/ContactPage'
import { ChatHubPage } from './modules/chat/pages/ChatHubPage'
import { PublicQuotationPage } from './modules/sales/pages/PublicQuotationPage'
import { ProjectDetailPage } from './modules/projects/pages/ProjectDetailPage'
import { ProjectsListPage } from './modules/projects/pages/ProjectsListPage'
import { NotificationsPage } from './modules/notifications/pages/NotificationsPage'
import { CreatorsListPage } from './modules/creators/pages/CreatorsListPage'
import { CreatorEditorPage } from './modules/creators/pages/CreatorEditorPage'
import { RenewalsPage } from './modules/renewals/pages/RenewalsPage'
import { ReportsPage } from './modules/reports/pages/ReportsPage'
import { AssistantPage } from './modules/assistant/pages/AssistantPage'
import { SettingsPage } from './modules/settings/pages/SettingsPage'
import { ActivityLogPage } from './modules/activity/pages/ActivityLogPage'
import { WeeklyReportPage } from './modules/weekly/pages/WeeklyReportPage'
import { CustomersListPage } from './modules/customers/pages/CustomersListPage'
import { Customer360Page } from './modules/customers/pages/Customer360Page'
import { SearchPage } from './modules/search/pages/SearchPage'
import { OpsCenterPage } from './modules/ops/pages/OpsCenterPage'
import { WorkHubPage } from './modules/work-hub/pages/WorkHubPage'
import { HelpPage } from './modules/help/pages/HelpPage'
import { KeyboardShortcutsPage } from './modules/keyboard/pages/KeyboardShortcutsPage'
import { LayoutPreferencesPage } from './modules/layout/pages/LayoutPreferencesPage'
import { StartPage } from './modules/start/pages/StartPage'
import { AboutPage } from './modules/about/pages/AboutPage'
import { StatusPage } from './modules/status/pages/StatusPage'

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
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/q/:token" element={<PublicQuotationPage />} />
      <Route
        path="/set-password"
        element={
          <RequireAuth allowMustChangePassword>
            <SetPasswordPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="start" element={<Module path="/app/start" element={<StartPage />} />} />
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
        <Route path="client" element={<Module path="/app/client" element={<ClientWorkspaceLayout />} />}>
          <Route index element={<ClientDashboardPage />} />
          <Route path="projects" element={<ClientProjectsPage />} />
          <Route path="brief" element={<ClientBriefPage />} />
          <Route path="reports" element={<ClientReportsPage />} />
          <Route path="chat" element={<ClientChatPage />} />
          <Route path="payment" element={<ClientPaymentPage />} />
        </Route>
        <Route path="projects" element={<Module path="/app/projects" element={<ProjectsListPage />} />} />
        <Route
          path="projects/:id"
          element={<Module path="/app/projects" element={<ProjectDetailPage />} />}
        />
        <Route path="chat" element={<Module path="/app/chat" element={<ChatHubPage />} />} />
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
        <Route path="timeline" element={<Navigate to="/app/work" replace />} />
        <Route path="settings" element={<Module path="/app/settings" element={<SettingsPage />} />} />
        <Route path="activity" element={<Module path="/app/activity" element={<ActivityLogPage />} />} />
        <Route path="weekly" element={<Module path="/app/weekly" element={<WeeklyReportPage />} />} />
        <Route
          path="customers"
          element={<Module path="/app/customers" element={<CustomersListPage />} />}
        />
        <Route
          path="customers/:id"
          element={<Module path="/app/customers" element={<Customer360Page />} />}
        />
        <Route path="search" element={<Module path="/app/search" element={<SearchPage />} />} />
        <Route path="ops" element={<Module path="/app/ops" element={<OpsCenterPage />} />} />
        <Route path="work" element={<Module path="/app/work" element={<WorkHubPage />} />} />
        <Route path="help" element={<Module path="/app/help" element={<HelpPage />} />} />
        <Route
          path="keyboard"
          element={<Module path="/app/keyboard" element={<KeyboardShortcutsPage />} />}
        />
        <Route
          path="layout"
          element={<Module path="/app/layout" element={<LayoutPreferencesPage />} />}
        />
        <Route path="about" element={<Module path="/app/about" element={<AboutPage />} />} />
        <Route path="status" element={<Module path="/app/status" element={<StatusPage />} />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
