<script setup lang="ts">
// A browsable catalog of the base components — not a real screen, just
// where the shared building blocks live for reference.
import { useI18n } from 'vue-i18n'
import { Palette } from '@lucide/vue'
import Button from '../components/Button.vue'
import Pill from '../components/Pill.vue'
import Card from '../components/Card.vue'
import Table from '../components/Table.vue'
import IconBadge from '../components/IconBadge.vue'
import StatCard from '../components/StatCard.vue'
import PageHeader from '../components/PageHeader.vue'

const { t } = useI18n()
</script>

<template>
  <PageHeader :title="t('styleGuide.title')" :subtitle="t('styleGuide.subtitle')">
    <template #icon><Palette :size="20" /></template>
  </PageHeader>

  <Card class="section">
    <template #header>{{ t('styleGuide.buttonHeader') }}</template>
    <div class="row">
      <Button variant="primary">{{ t('styleGuide.btnStartRep') }}</Button>
      <Button variant="secondary">{{ t('styleGuide.btnPeek') }}</Button>
      <Button variant="ghost">{{ t('styleGuide.btnCancel') }}</Button>
      <Button variant="primary" disabled>{{ t('styleGuide.btnDisabled') }}</Button>
    </div>
  </Card>

  <Card class="section">
    <template #header>{{ t('styleGuide.pillHeader') }}</template>
    <div class="row">
      <Pill tone="easy">Easy</Pill>
      <Pill tone="medium">Medium</Pill>
      <Pill tone="hard">Hard</Pill>
      <Pill tone="accent">{{ t('problemFlags.warm-up') }}</Pill>
      <Pill tone="accent">{{ t('problemFlags.master-copy') }}</Pill>
      <Pill tone="neutral">{{ t('problemFlags.rep-of', { id: 26 }) }}</Pill>
    </div>
  </Card>

  <Card class="section">
    <template #header>{{ t('styleGuide.cardHeader') }}</template>
    <div class="row">
      <Card>
        <template #header>{{ t('styleGuide.cardWithHeaderSlot') }}</template>
        <p>{{ t('styleGuide.cardWithHeaderBody') }}</p>
      </Card>
      <Card>
        <p>{{ t('styleGuide.cardNoHeaderBody') }}</p>
      </Card>
    </div>
  </Card>

  <Card class="section">
    <template #header>{{ t('styleGuide.tableHeader') }}</template>
    <Table>
      <thead>
        <tr>
          <th>{{ t('styleGuide.colHash') }}</th>
          <th>{{ t('styleGuide.colProblem') }}</th>
          <th>{{ t('styleGuide.colDifficulty') }}</th>
          <th>{{ t('styleGuide.colFlags') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>7</td>
          <td>Move Zeroes</td>
          <td><Pill tone="easy">Easy</Pill></td>
          <td><Pill tone="accent">{{ t('problemFlags.master-copy') }}</Pill></td>
        </tr>
        <tr>
          <td>29</td>
          <td>Longest Substring Without Repeating Chars</td>
          <td><Pill tone="medium">Medium</Pill></td>
          <td><Pill tone="accent">{{ t('problemFlags.master-copy') }}</Pill></td>
        </tr>
        <tr>
          <td>32</td>
          <td>Minimum Window Substring</td>
          <td><Pill tone="hard">Hard</Pill></td>
          <td></td>
        </tr>
      </tbody>
    </Table>
  </Card>

  <Card class="section">
    <template #header>{{ t('styleGuide.iconBadgeHeader') }}</template>
    <div class="row">
      <IconBadge tone="accent"><Palette :size="18" /></IconBadge>
      <IconBadge tone="easy"><Palette :size="18" /></IconBadge>
      <IconBadge tone="medium"><Palette :size="18" /></IconBadge>
      <IconBadge tone="hard"><Palette :size="18" /></IconBadge>
      <IconBadge tone="info"><Palette :size="18" /></IconBadge>
      <IconBadge tone="neutral"><Palette :size="18" /></IconBadge>
    </div>
  </Card>

  <Card class="section">
    <template #header>{{ t('styleGuide.statCardHeader') }}</template>
    <div class="row">
      <StatCard :label="t('styleGuide.sampleRepsDue')" value="4" :sublabel="t('styleGuide.sampleRepsDueSublabel')" tone="info">
        <template #icon><Palette :size="20" /></template>
      </StatCard>
      <StatCard :label="t('styleGuide.sampleColdRate')" value="72%" :sublabel="t('styleGuide.sampleColdRateSublabel')" tone="accent" hero>
        <template #icon><Palette :size="20" /></template>
      </StatCard>
    </div>
  </Card>
</template>

<style scoped>
.section {
  margin-bottom: var(--space-6);
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-4);
}
</style>
