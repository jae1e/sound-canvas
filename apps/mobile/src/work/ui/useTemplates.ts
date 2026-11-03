import { useCallback, useEffect, useState } from 'react';
import type { PlanTemplate } from '@vlc/session-engine';

import { getDb } from '../../db/client';
import { deleteTemplate, listTemplates, saveTemplate } from '../../db/repos/templates';

/** The user's saved plan templates. */
export function useTemplates() {
  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const reload = useCallback(() => {
    try {
      setTemplates(listTemplates(getDb()));
    } catch {
      setTemplates([]);
    }
  }, []);
  useEffect(reload, [reload]);
  const save = useCallback(
    (t: PlanTemplate) => {
      saveTemplate(getDb(), t, Date.now());
      reload();
    },
    [reload],
  );
  const remove = useCallback(
    (id: string) => {
      deleteTemplate(getDb(), id);
      reload();
    },
    [reload],
  );
  return { templates, save, remove, reload };
}
