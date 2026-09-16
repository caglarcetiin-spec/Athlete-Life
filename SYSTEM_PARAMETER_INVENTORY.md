# Motor ve çalışma parametreleri envanteri

Kaynak taraması: 16 Eylül 2026. Bu dosya kişisel kayıt veya bağlantı sırrı içermez.
Sayfa alanları, kalıcı ayar anahtarları, yüklenen modüller ve model kural dosyaları aşağıdadır. Sayısal model katsayılarının tam tanımları bağlantı verilen kaynak dosyalarındadır; bu envanter klinik geçerlilik değerlendirmesi değildir.

## Yüklenen 48 JavaScript modülü

| Sıra | Modül | Dışa açılan isimler | Tanımlı fonksiyonlar |
|---|---|---|---|
| 1 | [nutrition-library.js](nutrition-library.js) | NUTRITION_LIBRARY |  |
| 2 | [nutrition-ledger-engine.js](nutrition-ledger-engine.js) | NutritionLedger | append, findIndexById, normalize, removeById, repairDay, snapshot, totals, uid, updateById, verifyPersistent |
| 3 | [water-ledger-engine.js](water-ledger-engine.js) | WaterLedger | append, compat, ensureDay, entries, maps, migrateAll, removeById, total, updateById |
| 4 | [hydration-intelligence-engine.js](hydration-intelligence-engine.js) | HydrationIntelligence, todayKey | averageEstimate, context, estimate, latestBodyWeight, trainingContext |
| 5 | [health-state-engine.js](health-state-engine.js) | HealthStateEngine | assess, coachTypeOverride, flags, readinessPenalty |
| 6 | [capability-catalog.js](capability-catalog.js) | CAPABILITY_CATALOG |  |
| 7 | [exercise-knowledge-library.js](exercise-knowledge-library.js) | EXERCISE_KNOWLEDGE, EXERCISE_KNOWLEDGE_META |  |
| 8 | [load-prescription-engine.js](load-prescription-engine.js) | LoadPrescriptionEngine, bodyweightNow, readiness | anchorLoad, bodyweight, explain, isWeighted, parseRx, readinessFor, recommend, rows, templateLoad |
| 9 | [physiological-impact-engine.js](physiological-impact-engine.js) | AthleteLoadMesh | baseConfidence, bodyweightImpact, bw, continuousImpact, dateRange, durationEstimate, explosiveImpact, groupsForDate, impactForDate, intervalImpact, jointLoads, knowledge, loadedImpact, localRecovery, mergeMuscles, mobilityImpact, modelFor, movementImpact, muscleImpact, q, rest, restampDay, rolling, rollingBefore, sessionContext, sessionImpact, sprintImpact, stampRow, staticImpact, systemicPenalty, vals |
| 10 | [engine-bus.js](engine-bus.js) | EngineBus | graph, health, publish, register, subscribe |
| 11 | [data-lineage-engine.js](data-lineage-engine.js) | DataLineage | derived, estimated, explain, measured, node, recommended |
| 12 | [schema-migration-engine.js](schema-migration-engine.js) | SchemaMigration | current, migrate, validate |
| 13 | [event-store-engine.js](event-store-engine.js) | AthleteEventStore | append, bootstrapFromLegacy, health, list, load, safeParse, save, signature, stableToken, state |
| 14 | [server-sync.js](server-sync.js) | ALOSServerSync | beacon, bootstrap, compare, flush, health, parse, push, request, rev, savedAt, status, weight |
| 15 | [durable-persistence.js](durable-persistence.js) | ALOSDurablePersistence | allIDB, bootstrap, checksum, clone, compare, contentChecksum, forceJournal, hashString, health, latestIDB, makeRow, meta, openDB, parse, putIDB, queueIDB, rawCandidate, recoverIfNewer, rollbackCandidate, save, stable, weight |
| 16 | [app.js](app.js) | ALOSDurabilityFlush, ALOSFlushPendingUIState, ALOSPersistence, ALOSRecovery, ALOSRuntime, AthleteProgramEngine, EXERCISE_SCIENCE, V5_EXERCISE_MUSCLES, __ATHLETE_LIFE_OS_V5_READY__, __weekSaveTimer, calendarTodayKey, exerciseDoseUnits, exerciseMetricText, refreshTrainingPlanner, removeWaterLog, renderArchitectureV8, renderTrainingAdaptive, renderTrainingPlanSyncV81, resetTrainingViewToToday, setTrainingViewDate, syncSessionRouterToTrainingDate, trainingViewDate | __alosAutosaveIfDirty, __alosBootState, __alosDataWeight, __alosPersistSnapshot, __alosSafeParse, adaptationSuccessFor, addDaysKey, addExerciseV5, adjustPrescription, anatomySVG, athleteDayDate, athleteDayKey, avg, avgProteinAdequacy, avgSleepScience, bestIn, bindTrainingV5, bodyWeightRateScience, bodyweightNow, bodyweightWeeklyRate, buildAdaptiveWeekPlan, buildFuturePlan, buildFuturePlanV5, buildSVGHeatmap, buildShapeElement, calcMuscleVolume, calendarTodayKey, canonicalTemplate, characterConfidenceModel, characterMetrics, clamp, closeElapsedDays, closeElapsedDaysV5, coachTypeForToday, completeSessionV5, completedSessionType, computeWeekOptimizationRows, currentBodyWeightScience, currentProgramWeek, currentTodayPlan, currentWeekMondayKey, dailyEfficiencyScore, dateKeyObj, dayNameTr, daysBetween, displayCalendarDate, drawRadar, duration, effectiveSetFactor, ensureLifecycle, estimateFutureReadiness, exerciseBest, exerciseChrono, exercisesForMuscle, feedbackForPlanDate, filteredFoods, fmtMin, fmtRestSec, foodSnapshot, forecastReadinessV5, futureDateKeys, getGeneratedWeekPlan, getPlanForKey, getTomorrowPlan, goToPage, growthFieldForMuscle, growthMetricForMuscle, hardConstraintForProgramV92, hasTrainingOnDate, init, initBackupTools, initCharacterInputs, initCoachTabs, initDate, initDetailedTabs, initHeatmapViewToggle, initMuscleReport, initNutrition, initQuickNav, initReportTabs, initSettings, initTraining, initTrainingDateNavigation, initWeek, interferenceScience, lastNDates, lifecycleTick, liveSetAdvice, loadToday, localDateKey, manualCharacterContribution, maxPain, measuredEvidenceScience, measurementChangeForMuscle, mins, moveTooltip, musclePainScore, muscleProgressionScience, muscleRecoveryDetail, muscleRecoveryLedger, muscleRecoveryPenalty, muscleSetsForRow, muscleStimulus, muscleTrainingScience, normalizeFoodRow, nutrientTotalsForRows, nutritionForKey, nutritionGoalAdvice, nutritionMetricsForDate, optimizeWeek, overlayColor, overlayMetric, overlayModeDescription, painConflicts, painForDate, painLogRowsActiveAt, parseSetCount, parseTimeToMinutes, persistWeeklyScheduleFromUI, phaseForWeek, phaseForWeekV5, planAdherenceFor, planContributingRow, planForDate, planLoadModifier, planSignature, predictedReadinessForDay, previewFood, programBaseSlotV92, programPhaseLoadV92, programWeekV5, progressionAdvice, q, readiness, readinessTrend, recentRunKmScience, recommendWorkout, recommendedWindow, recoveryEnvironmentBetween, recoveryReadinessForMuscle, recoveryReferenceTime, refreshFoodSelect, refreshLifeOS, refreshLifeOSV5, refreshTrainingPlanner, renderAnalytics, renderArchitectureV8, renderBodyDevelopment, renderBodyMap, renderCharacter, renderCharacterConfidence, renderCharacterV5, renderCoach, renderCoachMonth, renderCoachTwelve, renderCoachV5, renderCoachWeek, renderCommandCenter, renderCritical, renderDailyReport, renderDetailed, renderDetailedDashboard, renderInteractiveHeatmap, renderLifecycleStatus, renderLifecycleStatusV5, renderMicronutrients, renderMonthlyReport, renderMuscleDetail, renderMuscleReport, renderMuscleTrend, renderMuscleVolume, renderNav, renderNutrition, renderNutritionAdvice, renderPainCoach, renderPlanVsActual, renderPortal, renderProgression, renderRecommendation, renderRecoveryDetail, renderReports, renderReportsV5, renderRunning, renderSavedWeekOptimization, renderScienceMethodology, renderScienceTrend, renderStrength, renderToday, renderTodayPlan, renderTodayTrainingPlan, renderTodayTrainingPlanV5, renderTomorrowCoach, renderTomorrowCoachV5, renderTradeoff, renderTraining, renderTrainingPlanSyncV81, renderTrainingV5, renderV5All, renderWeeklyReport, renderWeeklyTrainingPlan, renderWeeklyTrainingPlanV5, resetTrainingViewToToday, resolvedTemplate, restIntervalPrescription, rowRecoveryHalfLifeHours, safeRender, safeValue, save, saveBodyMeasurement, saveCharacterData, saveDaily, saveHealthStatus, savePlanVersion, saveTodayShift, scienceTrendForMuscle, scoreDayForSession, scoreFutureDay, scoreSessionDayV5, selectPlannerWeek, sessionMuscleKeys, sessionTypeFromLogs, setTrainingViewDate, shiftDataForKey, shiftLabel, sleepDuration, smartProgressionNote, socialDialog, stimulusScore, summarizeDayClose, templateForType, todayKey, trainingRowTime, trainingViewDate, trendSeriesForMuscle, v5DateKey, weekDatesFromToday, weekKeysFor, weekOptimizationKey, weekPlanInputs, weekPlannerDate, weeklyBuckets, weeklyUiSignature |
| 17 | [nutrition-record-engine.js](nutrition-record-engine.js) | NutritionRecordEngine | currentDb, duplicate, el, escapeHtml, foodIndexForRow, foods, init, open, refreshAll, refreshPreview, remove, rowById, runtime, saveEdit |
| 18 | [periodic-trend-engine.js](periodic-trend-engine.js) | PeriodicTrendEngine | addDays, bwAt, classify, dateNum, exerciseTrend, init, readinessDelta, render, rows, scoreRow, stateLabel, summary |
| 19 | [movement-intelligence-engine.js](movement-intelligence-engine.js) | MovementIntelligence, exerciseDoseUnits, exerciseMetricText, movementKnowledge | bind, coachCatalogAudit, confidenceWeight, currentRows, dataConfidenceFactor, demandBar, equipmentLabel, exerciseDoseUnits, exerciseMetricText, impactForRow, inferKnowledge, init, knowledge, labelText, optionLabel, percentBar, provisionalRow, rebuildExerciseSelect, render, renderCatalogAudit, renderLoadPrescription, renderPreview, renderScienceNote, renderSessionMuscleImpact, renderSignature, renderUnifiedPhysiologyPreview, selectedEquipment, selectedKnowledge, sessionMuscles, staticHoldFactor, updateInputMode |
| 20 | [ad-hoc-session-engine.js](ad-hoc-session-engine.js) | AdHocSession | addMovement, clearDraft, config, currentExercise, densityClass, fillExercises, init, kFor, makeRows, removeMovement, renderAnalysis, renderDraft, renderHistory, saveSession, summarizeRows, uid, updateValueMode |
| 21 | [pain-intelligence-core.js](pain-intelligence-core.js) |  | activeAtDate, aggregate, datePart, jointKey, maxSeverity, redFlag, sideCompatible |
| 22 | [pain-intelligence-engine.js](pain-intelligence-engine.js) | PainIntelligence | activeEntries, activeHotspots, allEntries, deleteEntry, deleteEntrySilent, editEntry, entriesForDate, entryLabel, exerciseAdvice, findEntry, id, init, initExerciseSelect, jointLoadProfile, movementSide, open3D, primaryRecommendations, recordsHTML, redFlagsFromUI, refreshAfterChange, renderActiveList, renderAdvice, resetForm, resolveEntry, saveEntry, severityClass |
| 23 | [bodymap3d.js](bodymap3d.js) | BodyMap3D | bindControls, compile, comps, createProgram, draw, fail, fetchModel, focusPainEntry, imageFromBufferView, init, initGL, loadArrayBuffer, makeTextureFromImage, modelLoaded, parseGLB, perspective, pickAt, pointsForHotspot, projectScenePoint, q, refreshPainHotspots, regionColors, renderJointHotspots, requestDraw, resize, rgba, rotateXPoint, rotateYPoint, selectRegion, setLoading, setOverlayMode, status, typedAccessor, update, uploadBuffer |
| 24 | [performance-trend-v2.js](performance-trend-v2.js) | PerformanceTrendV2 | score, series, summary, trend |
| 25 | [personal-calibration-engine.js](personal-calibration-engine.js) | PersonalCalibration | db, ema, nutritionMaintenance, rebuild, updateLoadResponse |
| 26 | [tissue-load-engine.js](tissue-load-engine.js) | TissueLoadEngine | impact, rolling |
| 27 | [adaptive-nutrition-engine.js](adaptive-nutrition-engine.js) | AdaptiveNutrition | targets |
| 28 | [sports-science-policy.js](sports-science-policy.js) | SportsSciencePolicy | addDays, audit, bodyweight, db, exerciseScore, muscleVolume, optimizeTemplate, recentRows, recoveryEnvironment, rowSets, sleepHours |
| 29 | [adaptive-coach-solver.js](adaptive-coach-solver.js) | AdaptiveCoachSolver | candidateScore, constraints, solve, weights |
| 30 | [canonical-session-engine.js](canonical-session-engine.js) | CanonicalSessionEngine | activeGuidedExecution, adoptGuidedSession, audit, clone, compactItem, db, equality, fingerprint, get, guidedExecutionStarted, guidedRows, hashString, isLocked, lock, material, movementNames, performed, plan, projectLegacyPlan, reconcileActive, refreshFromPlan, resolved, rt, snapshotFromMaterial, stores, targetedRows, template, unlock |
| 31 | [training-session-service.js](training-session-service.js) | TrainingSessionService | audit, contract, prescription, rows, safety, summary |
| 32 | [adaptive-intelligence.js](adaptive-intelligence.js) | completeSessionAdaptive, exerciseMetricText, initSessionRouter, openHistoricalSessionTarget, renderAdaptiveIntelligence, renderTrainingAdaptive, rowsForTarget, selectedSessionTargetKey, sessionActualKey, syncSessionRouterToTrainingDate | addExerciseAdaptive, asymmetryPair, autoSessionPlanKey, avgSessionRpe, bindAdaptive, bodyWeightWeeklyRate, calKey, completeSessionAdaptive, compressImage, deloadProbability, exercisePerformanceIndex, initSessionRouter, latestBodyMeasurements, latestMissedPlans, manualTrainingContext, measurementSignal, personalResponse, photoDB, planNameFor, plateauForExercise, renderAdaptiveIntelligence, renderAsymmetry, renderCoachWhy, renderGoalConflicts, renderMeasurementScheduler, renderPersonalModel, renderPhotoGallery, renderPlateaus, renderSFR, renderSessionRouter, renderTestingCalendar, renderTrainingAdaptive, renderUncertainty, rowsForTarget, savePhotoProgress, selectedSessionTargetKey, sessionActualKey, sfrForMuscle, weeklyMuscleSeries |
| 33 | [training-periods.js](training-periods.js) | TrainingPeriods | activate, addRow, analyze, archiveDraft, blank, decorate, endOf, estimateMinutes, fillForm, forDate, history, hybridDraft, init, outcomes, periods, phase, plan, progress, readForm, recoveryPenalty, render, renderCoach, renderDays, renderRoadmap, resetRow, rx, saveDraft, status, template, unitFor, updateUnit, validate |
| 34 | [record-manager.js](record-manager.js) | RecordManager | afterMutation, checkboxHTML, clearCharacter, cloneDB, confirmDelete, deleteBody, deleteDaily, deleteFood, deletePhoto, deleteSession, deleteSocial, deleteTraining, deleteWater, editBody, editCharacter, editDaily, editFood, editSession, editSocial, editTraining, editWater, empty, init, inputHTML, listItem, openEditor, pushUndo, renderRecordCenter, saveEditor, selectHTML, syncPerformedSnapshots, toast, undo, updateUndoButton, valuesFromDialog |
| 35 | [adherence-engine.js](adherence-engine.js) | AdherenceGuardian, renderAnalytics, renderReports, renderToday | adaptationScore, alertsFor, avgScore, basePrescription, bind, captureUpcoming, chartPoints, circDiff, colorVar, completedExerciseScore, currentWindowPassed, dailyAdherence, debtBefore, drawChart, ensurePlan, firstTrainingTime, histPlan, hookRenders, inferredSmartDeviation, init, isDayPast, maybeReoptimizeAfterCheckin, nutritionAdherence, parseWindow, renderGuardian, renderTrend, rowsForPlan, saveReason, series, signedTimeDiff, sleepQuantityScore, sleepScheduleScore, trainingTimingScore, weighted |
| 36 | [gap-reconciliation.js](gap-reconciliation.js) | GapReconciliation | approximateRows, detailed, hasAnyTraining, init, isPlannedTraining, markMissed, markRest, migration, planForGap, postpone, quickBackfill, refreshAll, renderGapCard, rowsForGap, saveQuickBackfill, scanPending, setLifecycleState |
| 37 | [athlete-profile-engine.js](athlete-profile-engine.js) | AthleteProfile | activateTab, addRecord, allEvidence, bestByTest, bestLabel, bindForms, confidence, deleteRecord, domainSummary, e1rm, editRecord, esc, formatRecord, genericResult, getGeneric, getPower, getRun, getSkill, getStrength, identity, init, latestBW, migrateLegacyEvidence, powerResult, renderAll, renderIdentity, renderNextTests, renderRecords, renderTierExplanation, runningResult, skillPerformanceScore, skillTier, strengthResult, tierForScore, tierFromIndex, tierFromThreshold |
| 38 | [nutrition-impact-engine.js](nutrition-impact-engine.js) | NutritionImpact | avgSleepScore, build, caffeineSleepRisk, carbStatus, carbTarget, classifyScore, confidence, currentBW, energyState, fatStatus, hydrationStatus, hypertrophyEnvironment, init, limiter, linearTrend, micronutrientSignal, muscleRetentionScore, performanceFueling, phaseQuality, proteinStatus, recentTrainingLoad, render, renderCausalMap, renderEffects, renderEvidence, renderMatrix, renderPhase, rollingHydration, rollingNutrition, roughPerformanceTrend, underfuelRisk, waistTrend |
| 39 | [rest-interval-engine.js](rest-interval-engine.js) | RestIntervalEngine | actualRests, assessRow, bind, currentExercise, currentReadiness, currentTarget, enhanceLiveAdvice, enrichPlanVsActual, fmtTimer, init, performanceDrop, plus30, prescription, render, renderEvidenceNote, renderRecommendation, renderSessionSummary, resetTimer, rowAdvice, rowsForCurrentTarget, setRestInputFromExercise, startPauseTimer, updateTimer |
| 40 | [guided-workout-core.js](guided-workout-core.js) |  | aggregatePerformedSets, completionSummary, ensureRowArrays, finiteIndex, finitePositive, firstIncomplete, firstIncompleteByCount, firstUnresolved, normalizeText, parsePrescription, performedSetCount, safeProgress, sanitizeSetCount, savedSetCount, writeRest, writeSet |
| 41 | [substitution-intelligence-core.js](substitution-intelligence-core.js) |  | actionClass, clamp, patternScore, planeClass, qualitySimilarity, score, weightedJaccard |
| 42 | [guided-workout-engine.js](guided-workout-engine.js) | GuidedWorkout | acceptSubstitution, active, actualDay, actualMovementProfile, allSourceStats, archiveAndClearStaleActive, beep, beginNextSet, bind, captureRest, clearActive, closeExercisePartial, closureReason, commit, completionSummaryForSession, completionSummaryForTarget, currentItem, deriveTimingStart, detectPendingSubstitution, drawTimingChart, durationFeedback, endSession, exerciseResolution, finalizeToCoach, finishGuided, fmtClock, guidedRowsForSession, hasGuidedExecution, hideStagePanels, init, itemEquipment, keepSubstitutionAsExtra, metricFallback, movementMatches, nextExercise, nextProgress, nowIso, pauseSession, pendingRow, performedCount, performedRefsForItem, phaseElapsed, planItems, planMovementProfile, plusRest, reconcilePlan, redoSet, render, renderAutomation, renderComplete, renderExerciseDone, renderHistory, renderQueue, renderRest, renderResultPanel, renderSubstitution, repairSession, repairTiming, resetSessionTimer, restScore, restartWorkout, restoreSelectionForActive, resumePause, rowEquipment, rowId, rowMatchesAnyPlannedItem, rowTargetDate, runnerRowFor, saveDynamicSet, saveSet, savedCount, secBetween, selectedTrainingDay, sessionElapsedSec, sessionHasExecution, setTargetText, showRunner, skipExercise, sourceStats, startSet, startWorkout, stopSet, substitutionCandidates, substitutionScore, syncFromLogs, syncPlanNow, targetKey, tick, timingRows, validTime, workStatus, workWindow |
| 43 | [backup-vault.js](backup-vault.js) | BackupVault | applyImport, autoRecoverLatestCheckpointIfNeeded, bind, cancelPreview, countCards, counts, createCheckpoint, deepDateMap, deleteCheckpoint, downloadBlob, exportBackup, getPhotos, hasMeaningfulData, idbGetAll, idbPutAll, init, makePayload, mergeArray, mergeDB, normalizeForApp, noteSave, openIDB, photoDB, previewFile, renderCheckpoints, renderSummary, restoreCheckpoint, sanitizeIncoming, sha256, stableStringify, status, vaultDB, verifyImport |
| 44 | [system-integrity-engine.js](system-integrity-engine.js) | SystemIntegrity, __SYSTEM_INTEGRITY_RUNNING__, initSessionRouter, renderAdaptiveIntelligence, rowsForTarget, selectedSessionTargetKey, sessionActualKey | clone, copySummary, fillNutritionAndSleep, finite, init, makeStorageSnapshot, render, restoreStorage, result, run, sandboxBase, summaryText |
| 45 | [training-mesh-dashboard.js](training-mesh-dashboard.js) | TrainingMeshDashboard | init, qx, render |
| 46 | [release-integrity-v8.js](release-integrity-v8.js) | ReleaseIntegrityV8 | run |
| 47 | [architecture-bootstrap.js](architecture-bootstrap.js) | ALOSArchitecture | db, init, modelSnapshot, register, wire |
| 48 | [athlete-coordinator.js](athlete-coordinator.js) | AthleteCoordinator | cloneReport, flush, init, inputs, renderStatus, schedule |

## Kalıcı ayar anahtarları

| Ayar | Okuyan / yazan kaynak |
|---|---|
| `commute` | [adherence-engine.js](adherence-engine.js), [app.js](app.js) |
| `dayBoundaryHour` | [app.js](app.js) |
| `guidedSound` | [guided-workout-engine.js](guided-workout-engine.js) |
| `lateSessionCutoffHour` | [adaptive-intelligence.js](adaptive-intelligence.js) |
| `measurementMdcCm` | [adaptive-intelligence.js](adaptive-intelligence.js) |
| `nutritionGoalMode` | [nutrition-impact-engine.js](nutrition-impact-engine.js) |
| `prep` | [adherence-engine.js](adherence-engine.js), [app.js](app.js) |
| `programStartDate` | [app.js](app.js) |
| `targetCalories` | [adaptive-nutrition-engine.js](adaptive-nutrition-engine.js), [app.js](app.js), [nutrition-impact-engine.js](nutrition-impact-engine.js) |
| `targetProtein` | [app.js](app.js) |
| `targetSleep` | [adherence-engine.js](adherence-engine.js), [app.js](app.js), [nutrition-impact-engine.js](nutrition-impact-engine.js) |
| `targetWater` | [app.js](app.js) |
| `targetWeight` | [adaptive-nutrition-engine.js](adaptive-nutrition-engine.js), [app.js](app.js) |

## Arayüzdeki çalışma parametreleri

Başlangıç değerleri HTML tanımlarıdır; saklanan kullanıcı değerleri ve hesaplanan öneriler açılışta bunların yerine geçebilir. Dinamik seçenekler ilgili modüllerden yüklenir.

| Sayfa | Alan | Tür | Alt / üst / adım | HTML başlangıcı | Seçenekler |
|---|---|---|---|---|---|
| today | deviationReason | select |  /  /  |  | , sleep_debt, work, social, pain, time, energy, other |
| today | bedTime | time |  /  /  | 00:30 |  |
| today | sleepTime | time |  /  /  | 00:45 |  |
| today | wakeTime | time |  /  /  | 08:45 |  |
| today | nightAwake | number | 0 /  /  | 0 |  |
| today | sleepQuality | number | 1 / 5 /  | 4 |  |
| today | energy | number | 1 / 5 /  | 4 |  |
| today | motivation | number | 1 / 5 /  | 4 |  |
| today | soreness | number | 1 / 5 /  | 2 |  |
| today | joint | number | 1 / 5 /  | 5 |  |
| today | stress | number | 1 / 5 /  | 2 |  |
| today | weight | number |  /  / 0.1 | 72 |  |
| today | waist | number |  /  / 0.1 | 78 |  |
| today | runKm | number |  /  / 0.1 | 0 |  |
| today | runMinutes | number |  /  / 1 | 0 |  |
| today | runRpe | number | 0 / 10 /  | 0 |  |
| today | healthStatus | select |  /  /  |  | normal, fatigued, mild_illness, sick, recovering |
| today | fatigueLevel | number | 0 / 10 / 1 | 0 |  |
| today | illnessSeverity | number | 0 / 10 / 1 | 0 |  |
| today | healthNote | text |  /  /  |  |  |
| today | healthFever | checkbox |  /  /  |  |  |
| today | healthCough | checkbox |  /  /  |  |  |
| today | healthSoreThroat | checkbox |  /  /  |  |  |
| today | healthHeadache | checkbox |  /  /  |  |  |
| today | healthGI | checkbox |  /  /  |  |  |
| today | healthDizziness | checkbox |  /  /  |  |  |
| today | healthChestBreathing | checkbox |  /  /  |  |  |
| today | painLogDate | date |  /  /  |  |  |
| today | painJoint | select |  /  /  |  | shoulder, elbow, wrist, hand, neck, upperBack, lowBack, hip, knee, ankle, foot |
| today | painSide | select |  /  /  |  | left, right, bilateral, midline |
| today | painSeverity | number | 0 / 10 / 1 | 0 |  |
| today | painContext | select |  /  /  |  | movement, after_training, rest, morning, daily |
| today | painOnset | select |  /  /  |  | gradual, sudden, trauma |
| today | painSensation | select |  /  /  |  | ache, sharp, stiffness, burning, tingling, other |
| today | painDurationDays | number | 0 / 3650 / 1 | 0 |  |
| today | painTriggerExercise | select |  /  /  |  |  |
| today | painNote | text |  /  /  |  |  |
| today | painFlagSwelling | checkbox |  /  /  |  |  |
| today | painFlagNumbness | checkbox |  /  /  |  |  |
| today | painFlagWeakness | checkbox |  /  /  |  |  |
| today | painFlagInstability | checkbox |  /  /  |  |  |
| today | painFlagCannotUse | checkbox |  /  /  |  |  |
| today | painFlagNightRestPain | checkbox |  /  /  |  |  |
| today | todayWorkStatus | select |  /  /  |  | off, work, annual |
| today | todayShift | select |  /  /  |  | morning, mid, evening |
| today | workIntensity | number | 1 / 5 /  | 3 |  |
| today | steps | number | 0 /  /  | 9000 |  |
| week | weekDate | date |  /  /  |  |  |
| training | periodName | input |  /  /  |  |  |
| training | periodGoal | select |  /  /  |  | hybrid, strength, hypertrophy, endurance, skill |
| training | periodModel | input |  /  /  |  |  |
| training | periodStart | date |  /  /  |  |  |
| training | periodWeeks | number | 1 / 52 /  | 12 |  |
| training | periodDeload | select |  /  /  |  | 0, 3, 4, 6 |
| training | periodProgression | select |  /  /  |  | double, hold |
| training | periodDay | select |  /  /  |  |  |
| training | periodExercise | select |  /  /  |  |  |
| training | periodSets | number | 1 / 10 /  | 3 |  |
| training | periodMin | number | 0.1 /  / 0.1 | 6 |  |
| training | periodMax | number | 0.1 /  / 0.1 | 10 |  |
| training | periodRir | number | 0 / 5 /  | 2 |  |
| training | periodRest | number | 0 / 600 / 5 | 150 |  |
| training | periodLoad | number | 0 / 500 / 0.5 |  |  |
| training | periodStep | number | 0.1 / 10 / 0.1 | 2.5 |  |
| training | sessionAttributionMode | select |  /  /  |  |  |
| training | sessionCustomDate | date |  /  /  |  |  |
| training | lateSessionCutoff | select |  /  /  |  | 2, 4, 6 |
| training | guidedResultValue | number | 0 /  / 1 |  |  |
| training | guidedResultLoad | number | 0 /  / 0.5 |  |  |
| training | guidedResultRir | number | 0 / 5 / 0.5 | 2 |  |
| training | guidedResultNote | text |  /  /  |  |  |
| training | guidedPartialReason | select |  /  /  |  | fatigue, performance_drop, form_quality, pain, time, other |
| training | sessionRpe | number | 1 / 10 / 0.5 | 7 |  |
| training | sessionDuration | number | 0 /  / 5 | 75 |  |
| training | sessionNote | input |  /  /  |  |  |
| training | adhocStructure | select |  /  /  |  | circuit, continuous, superset, straight_sets, emom, amrap, for_time |
| training | adhocRounds | number | 1 / 20 / 1 | 3 |  |
| training | adhocDuration | number | 1 / 240 / 1 | 15 |  |
| training | adhocRpe | number | 1 / 10 / 0.5 | 7 |  |
| training | adhocExerciseRest | number | 0 / 600 / 5 | 0 |  |
| training | adhocRoundRest | number | 0 / 900 / 5 | 60 |  |
| training | adhocExerciseSelect | select |  /  /  |  |  |
| training | adhocValue | number | 0.1 /  / 1 | 10 |  |
| training | adhocLoad | number | 0 /  / 0.5 | 0 |  |
| training | adhocDistanceM | number | 0 /  / 1 | 0 |  |
| training | manualTrainingDate | text |  /  /  |  |  |
| training | manualTrainingCalendar | date |  /  /  |  |  |
| training | exerciseEquipmentFilter | select |  /  /  |  | all |
| training | exerciseSelect | select |  /  /  |  |  |
| training | exerciseLoad | number |  /  / 0.5 | 0 |  |
| training | set1 | number |  /  / 0.1 |  |  |
| training | set2 | number |  /  / 0.1 |  |  |
| training | set3 | number |  /  / 0.1 |  |  |
| training | set4 | number |  /  / 0.1 |  |  |
| training | set5 | number |  /  / 0.1 |  |  |
| training | exerciseRir | number | 0 / 5 /  | 2 |  |
| training | exerciseRestPlanned | number | 0 /  / 15 | 120 |  |
| training | rest12 | number | 0 /  / 5 |  |  |
| training | rest23 | number | 0 /  / 5 |  |  |
| training | rest34 | number | 0 /  / 5 |  |  |
| training | rest45 | number | 0 /  / 5 |  |  |
| nutrition | mealType | select |  /  /  |  | (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri) |
| nutrition | foodSearch | search |  /  /  |  |  |
| nutrition | foodCategory | select |  /  /  |  |  |
| nutrition | foodSelect | select |  /  /  |  |  |
| nutrition | servings | number | 0.25 /  / 0.25 | 1 |  |
| nutrition | foodTime | time |  /  /  |  |  |
| detailed | bodyDate | date |  /  /  |  |  |
| detailed | bodyWeight | number |  /  / 0.1 |  |  |
| detailed | bodyShoulders | number |  /  / 0.1 |  |  |
| detailed | bodyChest | number |  /  / 0.1 |  |  |
| detailed | bodyWaist | number |  /  / 0.1 |  |  |
| detailed | bodyHips | number |  /  / 0.1 |  |  |
| detailed | bodyArmR | number |  /  / 0.1 |  |  |
| detailed | bodyArmL | number |  /  / 0.1 |  |  |
| detailed | bodyThighR | number |  /  / 0.1 |  |  |
| detailed | bodyThighL | number |  /  / 0.1 |  |  |
| detailed | bodyCalfR | number |  /  / 0.1 |  |  |
| detailed | bodyCalfL | number |  /  / 0.1 |  |  |
| detailed | photoFront | file |  /  /  |  |  |
| detailed | photoSide | file |  /  /  |  |  |
| detailed | photoBack | file |  /  /  |  |  |
| character | capSkillSelect | select |  /  /  |  |  |
| character | capSkillValue | number | 0 /  / 0.1 |  |  |
| character | capSkillLoad | number | 0 /  / 0.5 |  |  |
| character | capSkillDate | date |  /  /  |  |  |
| character | capSkillNote | text |  /  /  |  |  |
| character | capStrengthSelect | select |  /  /  |  |  |
| character | capStrengthLoad | number | 0 /  / 0.5 |  |  |
| character | capStrengthReps | number | 1 /  / 1 | 1 |  |
| character | capStrengthBW | number | 0 /  / 0.1 |  |  |
| character | capStrengthDate | date |  /  /  |  |  |
| character | capRunSelect | select |  /  /  |  |  |
| character | capRunDistance | number | 0.1 /  / 0.01 |  |  |
| character | capRunMinutes | number | 0.1 /  / 0.01 |  |  |
| character | capRunDate | date |  /  /  |  |  |
| character | capRunNote | text |  /  /  |  |  |
| character | capPowerSelect | select |  /  /  |  |  |
| character | capPowerValue | number | 0 /  / 0.01 |  |  |
| character | capPowerDate | date |  /  /  |  |  |
| character | capPowerNote | text |  /  /  |  |  |
| character | capBalanceSelect | select |  /  /  |  |  |
| character | capBalanceValue | number | 0 /  / 0.01 |  |  |
| character | capBalanceDate | date |  /  /  |  |  |
| character | capBalanceNote | text |  /  /  |  |  |
| character | capWorkSelect | select |  /  /  |  |  |
| character | capWorkValue | number | 0 /  / 0.01 |  |  |
| character | capWorkDate | date |  /  /  |  |  |
| character | capWorkNote | text |  /  /  |  |  |
| character | capMobilitySelect | select |  /  /  |  |  |
| character | capMobilityValue | number | 0 /  / 0.01 |  |  |
| character | capMobilityDate | date |  /  /  |  |  |
| character | capMobilityNote | text |  /  /  |  |  |
| character | capEnduranceSelect | select |  /  /  |  |  |
| character | capEnduranceValue | number | 0 /  / 0.01 |  |  |
| character | capEnduranceDate | date |  /  /  |  |  |
| character | capEnduranceNote | text |  /  /  |  |  |
| character | charPlanche | number | 0 /  / 0.1 |  |  |
| character | charFrontLever | number | 0 /  / 0.1 |  |  |
| character | charBackLever | number | 0 /  / 0.1 |  |  |
| character | charMuscleUp | number | 0 /  / 1 |  |  |
| character | charLSit | number | 0 /  / 0.1 |  |  |
| character | charBodyweight | number | 0 /  / 0.1 |  |  |
| character | charWpuLoad | number | 0 /  / 0.5 |  |  |
| character | charWpuReps | number | 0 /  / 1 |  |  |
| character | charDipLoad | number | 0 /  / 0.5 |  |  |
| character | charDipReps | number | 0 /  / 1 |  |  |
| character | charOHP | number | 0 /  / 0.5 |  |  |
| character | char5k | number | 0 /  / 0.01 |  |  |
| character | charLongRun | number | 0 /  / 0.1 |  |  |
| character | charCooper | number | 0 /  / 10 |  |  |
| character | charWeeklyKm | number | 0 /  / 0.1 |  |  |
| character | charVJump | number | 0 /  / 0.5 |  |  |
| character | charBroadJump | number | 0 /  / 1 |  |  |
| character | charSprint10 | number | 0 /  / 0.01 |  |  |
| character | charSprint30 | number | 0 /  / 0.01 |  |  |
| character | charMaxPullups | number | 0 /  / 1 |  |  |
| character | charMaxPushups | number | 0 /  / 1 |  |  |
| character | charBurpee5 | number | 0 /  / 1 |  |  |
| character | charPlank | number | 0 /  / 1 |  |  |
| character | charShoulderMob | number | 0 / 100 / 1 |  |  |
| character | charHipMob | number | 0 / 100 / 1 |  |  |
| character | charAnkleMob | number | 0 / 100 / 1 |  |  |
| character | charBalance | number | 0 / 100 / 1 |  |  |
| reports | bodyMapModelFile | file |  /  /  |  |  |
| records | recordManagerDate | date |  /  /  |  |  |
| settings | targetSleep | number |  /  / 0.25 | 8 |  |
| settings | prepMinutes | number |  /  /  | 45 |  |
| settings | commuteMinutes | number |  /  /  | 35 |  |
| settings | targetProtein | number |  /  /  | 150 |  |
| settings | targetCalories | number |  /  /  | 2850 |  |
| settings | targetWater | number |  /  / 0.1 | 3 |  |
| settings | targetWeight | number |  /  / 0.1 | 76 |  |
| settings | nutritionGoalMode | select |  /  /  |  | auto, lean_gain, recomp, cut |
| settings | programStartDate | date |  /  /  |  |  |
| settings | dayBoundaryHour | select |  /  /  |  | 0, 2, 4, 5 |
| settings | settingsLateSessionCutoff | select |  /  /  |  | 2, 4, 6 |
| settings | measurementMdcCm | number | 0.1 / 2 / 0.1 | 0.5 |  |
| settings | vaultImportInput | file |  /  /  |  |  |
| settings | socialType | select |  /  /  |  | (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri) |
| settings | socialStart | time |  /  /  | 21:00 |  |
| settings | socialEnd | time |  /  /  | 00:30 |  |
| settings | socialPriority | select |  /  /  |  | (etiket değeri), (etiket değeri), (etiket değeri) |
| settings | gapBackfillTime | time |  /  /  |  |  |
| settings | gapBackfillDuration | number | 0 /  / 5 | 60 |  |
| settings | gapBackfillRpe | number | 0 / 10 / 0.5 | 7 |  |
| settings | gapBackfillCompletion | select |  /  /  |  | 100, 75, 50 |
| settings | gapBackfillNote | text |  /  /  |  |  |
| settings | nutritionEditMeal | select |  /  /  |  | (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri), (etiket değeri) |
| settings | nutritionEditFood | select |  /  /  |  |  |
| settings | nutritionEditServings | number | 0.01 /  / 0.25 | 1 |  |
| settings | nutritionEditTime | time |  /  /  |  |  |

## Kural, kanıt ve katalog dosyaları

| Dosya | Üst düzey alanlar |
|---|---|
| [athlete-profile-library.json](athlete-profile-library.json) | version, philosophy, sources, strengthBands, runningBands, notes |
| [exercise-library.json](exercise-library.json) | version, principle, note, muscles, disciplines, metrics, movementPatterns, engine, exercise_count, exercise_catalog, major_muscle_regions, v79Added |
| [hydration-intelligence-evidence.json](hydration-intelligence-evidence.json) | version, sources, limits |
| [load-prescription-rules.json](load-prescription-rules.json) | version, principle, units, progression, baseline_warning |
| [movement-science-evidence.json](movement-science-evidence.json) | version, principles, limitations |
| [nutrition-impact-evidence.json](nutrition-impact-evidence.json) | version, engine, principles, engineering_notes |
| [nutrition-library-meta.json](nutrition-library-meta.json) | version, items, basis, source_note, variation_note, tracked_nutrients, count, schemaVersion, persistence, categories, note |
| [pain-intelligence-rules.json](pain-intelligence-rules.json) | version, scope, severity_guardrails, red_flags, note |
| [physiological-impact-evidence.json](physiological-impact-evidence.json) | version, scope, sources, limits |
| [rest-interval-evidence.json](rest-interval-evidence.json) | version, engine, principles, engineering_notes |
| [science-library.json](science-library.json) | version, purpose, principles, measurement_protocols, engine |

## Sunucu parametreleri

| Parametre | Davranış |
|---|---|
| STORAGE_BACKEND | sqlite veya mongodb; hata halinde otomatik depo değişimi yok |
| MONGODB_URI | Yerel `.env` / ortam değişkeninde bağlantı sırrı |
| MONGODB_DATABASE | MongoDB veritabanı adı |
| PORT | Varsayılan 10000 |
| ATHLETE_LIFE_OS_DATA_DIR | SQLite veri klasörü |
| MongoDB bağlantısı | Seçim 20 sn, bağlantı 10 sn, soket 15 sn; majority yazma onayı |
| Snapshot saklama | Son 250 revizyon; liste API’si son 50; SHA-256 doğrulama |
| MongoDB belge sınırı | 16 MiB; durum tek snapshot olarak tutulur |
