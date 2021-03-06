/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {HealthcheckResult} from '../reducers/healthchecks';
import {getHealthchecks, getEnvInfo, Healthchecks} from 'flipper-doctor';

let healthcheckIsRunning: boolean;
let runningHealthcheck: Promise<void>;

export type HealthcheckEventsHandler = {
  updateHealthcheckResult: (
    categoryKey: string,
    itemKey: string,
    result: HealthcheckResult,
  ) => void;
  startHealthchecks: (healthchecks: Healthchecks) => void;
  finishHealthchecks: () => void;
};

export type HealthcheckSettings = {
  enableAndroid: boolean;
};

export type HealthcheckOptions = HealthcheckEventsHandler & HealthcheckSettings;

async function launchHealthchecks(options: HealthcheckOptions): Promise<void> {
  const healthchecks = getHealthchecks();
  if (!options.enableAndroid) {
    healthchecks.android = {
      label: healthchecks.android.label,
      isSkipped: true,
      skipReason:
        'Healthcheck is skipped, because "Android Development" option is disabled in the Flipper settings',
    };
  }
  options.startHealthchecks(healthchecks);
  const environmentInfo = await getEnvInfo();
  for (const [categoryKey, category] of Object.entries(healthchecks)) {
    if (category.isSkipped) {
      continue;
    }
    for (const h of category.healthchecks) {
      const checkResult = await h.run(environmentInfo);
      const result: HealthcheckResult =
        checkResult.hasProblem && h.isRequired
          ? {
              status: 'FAILED',
              helpUrl: checkResult.helpUrl,
            }
          : checkResult.hasProblem && !h.isRequired
          ? {
              status: 'WARNING',
              helpUrl: checkResult.helpUrl,
            }
          : {status: 'SUCCESS'};
      options.updateHealthcheckResult(categoryKey, h.key, result);
    }
  }
  options.finishHealthchecks();
}

export default async function runHealthchecks(
  options: HealthcheckOptions,
): Promise<void> {
  if (healthcheckIsRunning) {
    return runningHealthcheck;
  }
  runningHealthcheck = launchHealthchecks(options);
  return runningHealthcheck;
}
