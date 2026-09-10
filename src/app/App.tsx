import { useState } from 'react';
import { RuleDashboard } from './components/RuleDashboard';
import { RuleCreator } from './components/RuleCreator';
import { SchedulerCreator } from './components/SchedulerCreator';
import { RuleList } from './components/RuleList';
import { RuleScheduler } from './components/RuleScheduler';
import { RuleEditDrawer } from './components/RuleEditDrawer';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { DaysOutDesignOptions } from './components/DaysOutDesignOptions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Plus } from 'lucide-react';
import { toast, Toaster } from 'sonner@2.0.3';
import { deriveStatusFromSchedule } from './utils/ruleDuplicate';
import { sampleRules } from './data/sampleRules';
import { hydrateRuleForForm, hydrateRulesList } from './utils/ruleFormHydration';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rules, setRules] = useState(() => hydrateRulesList(sampleRules));
  const [schedulers, setSchedulers] = useState([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showSchedulerCreator, setShowSchedulerCreator] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState<'create' | 'duplicate'>('create');
  const [duplicatingFromRule, setDuplicatingFromRule] = useState<any>(null);
  const [lastCreatedRuleId, setLastCreatedRuleId] = useState<string | null>(null);

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  const handleUpdateRuleStatus = (ruleId: string, status: string) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, status } : rule
    ));
  };

  const handleUpdateRule = (ruleId: string, updatedRule: any) => {
    setRules(rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updatedRule } : rule
    ));
  };

  const handleCreateRule = (newRule: any) => {
    if (editingRule) {
      // Update existing rule
      handleUpdateRule(editingRule.id, newRule);
      setEditingRule(null);
      toast.success('Rule updated successfully!', {
        description: `"${newRule.name}" has been updated.`,
        duration: 4000,
      });
    } else {
      const status = deriveStatusFromSchedule(newRule.schedule, newRule.scheduleData);
      const rule = {
        ...newRule,
        id: String(rules.length + 1),
        status,
        createdDate: new Date().toISOString().split('T')[0],
        lastExecuted: null,
        executionCount: 0,
        revenueImpact: '$0',
        scheduleCount: 0,
        scheduleNames: undefined,
      };
      setRules([rule, ...rules]);
      setLastCreatedRuleId(rule.id);

      if (creatorMode === 'duplicate' && duplicatingFromRule) {
        toast.success('Rule duplicated successfully', {
          description: `"${newRule.name}" was created from "${duplicatingFromRule.name}".`,
          duration: 4000,
        });
      } else if (status === 'scheduled') {
        toast.success('Rule created and scheduled!', {
          description: `"${newRule.name}" is now ${rule.status}.`,
          duration: 4000,
        });
      } else {
        toast.success('Rule saved as draft!', {
          description: `"${newRule.name}" has been saved. Click "Schedule Rule" to activate it.`,
          duration: 5000,
        });
      }
    }
    setShowCreator(false);
    setCreatorMode('create');
    setDuplicatingFromRule(null);
  };

  const handleOpenCreateRule = () => {
    setEditingRule(null);
    setDuplicatingFromRule(null);
    setCreatorMode('create');
    setShowCreator(true);
  };

  const handleDuplicateRule = (rule: any) => {
    setEditingRule(null);
    setDuplicatingFromRule(hydrateRuleForForm(rule));
    setCreatorMode('duplicate');
    setShowCreator(true);
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setShowCreator(true);
  };

  const handleOpenEditDrawer = (rule: any) => {
    setEditingRule(rule);
    setEditDrawerOpen(true);
  };

  const handleCreateScheduler = (schedulerData: any) => {
    const newScheduler = {
      ...schedulerData,
      id: String(schedulers.length + 1),
      createdDate: new Date().toISOString().split('T')[0],
      creationSource: schedulerData.creationSource ?? 'manual',
      importStatus: schedulerData.importStatus ?? null,
      importValidationErrors: schedulerData.importValidationErrors ?? [],
    };

    setSchedulers([...schedulers, newScheduler]);
    setShowSchedulerCreator(false);

    toast.success('Scheduler created successfully!', {
      description: `"${schedulerData.scheduleName}" has been saved.`,
      duration: 4000,
    });
  };

  const handleImportSchedulers = (importedSchedulers: any[], summary: { created: number; needsAttention: number }) => {
    const startIndex = schedulers.length;
    const withIds = importedSchedulers.map((scheduler, index) => ({
      ...scheduler,
      id: scheduler.id ?? String(startIndex + index + 1),
      createdDate: scheduler.createdDate ?? new Date().toISOString().split('T')[0],
    }));

    setSchedulers([...schedulers, ...withIds]);
    setShowSchedulerCreator(false);

    const attentionNote = summary.needsAttention > 0
      ? ` ${summary.needsAttention} need attention.`
      : '';
    toast.success(`${summary.created} scheduler(s) imported.${attentionNote}`, {
      description: summary.needsAttention > 0
        ? 'Review flagged records in the scheduler list.'
        : 'All imported schedulers are complete.',
      duration: 5000,
    });
  };

  const handleUpdateScheduler = (updatedScheduler: any, options?: { skipToast?: boolean }) => {
    if (updatedScheduler?.id == null) return false;

    let found = false;
    setSchedulers((prev) =>
      prev.map((scheduler) => {
        if (String(scheduler.id) !== String(updatedScheduler.id)) return scheduler;
        found = true;
        return { ...scheduler, ...updatedScheduler };
      })
    );

    if (!found) return false;

    if (!options?.skipToast) {
      toast.success('Scheduler updated successfully!', {
        description: `"${updatedScheduler.scheduleName ?? 'Scheduler'}" has been updated.`,
        duration: 4000,
      });
    }

    return true;
  };

  const handleDeleteScheduler = (schedulerId: string) => {
    setSchedulers(schedulers.filter(scheduler => scheduler.id !== schedulerId));
  };

  const handleBulkUpdateSchedulers = (schedulerIds: string[], updates: Record<string, any>) => {
    setSchedulers((prev) =>
      prev.map((scheduler) =>
        schedulerIds.includes(scheduler.id) ? { ...scheduler, ...updates } : scheduler
      )
    );
    toast.success(`Updated ${schedulerIds.length} scheduler(s)`);
  };

  const handleBulkDeleteSchedulers = (schedulerIds: string[]) => {
    setSchedulers(schedulers.filter(scheduler => !schedulerIds.includes(scheduler.id)));
    toast.success(`Deleted ${schedulerIds.length} scheduler(s)`);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    toast.success('Welcome to CARGAIN!', {
      description: 'You have successfully logged in.',
      duration: 3000,
    });
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" duration={15000} expand={false} visibleToasts={3} closeButton />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <Header />
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {showSchedulerCreator ? (
          <SchedulerCreator
            onCancel={() => setShowSchedulerCreator(false)}
            onSave={handleCreateScheduler}
            onImportSave={handleImportSchedulers}
            existingSchedulers={schedulers}
          />
        ) : (
          <>
            <div className={showCreator ? 'hidden' : undefined}>
              <RuleList
                rules={rules}
                schedulers={schedulers}
                onUpdateStatus={handleUpdateRuleStatus}
                onDelete={handleDeleteRule}
                onUpdateRule={handleUpdateRule}
                onEdit={handleEditRule}
                onCreateRule={handleOpenCreateRule}
                onDuplicateRule={handleDuplicateRule}
                lastCreatedRuleId={lastCreatedRuleId}
                onHighlightConsumed={() => setLastCreatedRuleId(null)}
                onCreateScheduler={() => setShowSchedulerCreator(true)}
                onUpdateScheduler={handleUpdateScheduler}
                onDeleteScheduler={handleDeleteScheduler}
                onBulkUpdateSchedulers={handleBulkUpdateSchedulers}
                onBulkDeleteSchedulers={handleBulkDeleteSchedulers}
              />
            </div>
            {showCreator && (
              <RuleCreator
                onCancel={() => {
                  setShowCreator(false);
                  setEditingRule(null);
                  setDuplicatingFromRule(null);
                  setCreatorMode('create');
                }}
                onSave={handleCreateRule}
                editingRule={editingRule}
                mode={creatorMode}
                sourceRule={duplicatingFromRule}
                existingRuleNames={rules.map((rule) => rule.name)}
              />
            )}
          </>
        )}
      </main>
      <Toaster 
        position="top-right" 
        richColors 
        expand={false}
        duration={15000}
        visibleToasts={3}
        closeButton
        toastOptions={{
          duration: 15000,
          style: {
            padding: '16px',
            fontSize: '15px',
          },
          className: 'toast-custom',
        }}
      />
    </div>
  );
}