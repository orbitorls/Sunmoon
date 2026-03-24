/**
 * Calibration Management UI Component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Calendar
} from 'lucide-react';

import { calibrationManager, CalibrationResult, QAMetrics } from '@/lib/calibration-system';
import type { LocationData } from '@/lib/tide-service';

interface CalibrationManagementPanelProps {
  location: LocationData;
}

export function CalibrationManagementPanel({ location }: CalibrationManagementPanelProps) {
  const [calibrationSummary, setCalibrationSummary] = useState<any>(null);
  const [qaMetrics, setQaMetrics] = useState<QAMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'recommendations'>('overview');

  useEffect(() => {
    loadCalibrationData();
  }, [location]);

  const loadCalibrationData = async () => {
    setIsLoading(true);
    try {
      // Load calibration summary
      const summary = calibrationManager.getCalibrationSummary();
      setCalibrationSummary(summary);

      // Get recommendations
      const recs = calibrationManager.getCalibrationRecommendations(selectedRegion || 'default');
      setRecommendations(recs);

      // Get QA metrics
      const qa = await calibrationManager.generateQAMetrics(selectedRegion || 'default');
      setQaMetrics(qa);
    } catch (error) {
      console.error('Failed to load calibration data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runCalibration = async () => {
    setIsLoading(true);
    try {
      // This would typically be called with observation data
      // For demo purposes, we'll show success
      alert('กำลังทำการ Calibrate... (จำลองใน production)');
    } catch (error) {
      alert('Calibration failed: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyCalibration = async () => {
    setIsLoading(true);
    try {
      const success = await calibrationManager.applyCalibrationCorrections(selectedRegion || 'default');
      if (success) {
        alert('นำไป Calibrations แล้ว');
        loadCalibrationData();
      }
    } catch (error) {
      alert('Failed to apply calibrations: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'good': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
      case 'fair': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
      case 'poor': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetricColor = (value: number, goodThreshold: number, badThreshold: number) => {
    if (value >= goodThreshold) return 'text-green-600';
    if (value >= badThreshold) return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            การจัดการ Calibrate และ QA
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadCalibrationData}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={runCalibration} disabled={isLoading}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Calibrate
            </Button>
          </div>
        </div>
        <CardDescription>
          จัดการคุณภาพ และการปรับปรงงของแบบจำลองน้ำขึ้นน้ำลง
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
            <TabsTrigger value="metrics">ตัวชี้ววัด</TabsTrigger>
            <TabsTrigger value="recommendations">คำแนะนำ</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {calibrationSummary ? (
              <>
                {/* Overall Status */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {calibrationSummary.totalRegions}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ภูมทั้งหมด
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {calibrationSummary.calibratedRegions}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ผ่าน Calibrate
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {calibrationSummary.averageQuality.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      คุณภาพเฉลี่ยว
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {calibrationSummary.needsRecalibration.length}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ต้อง Recalibrate
                    </div>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    ปรับปรงงล่าสุด: {calibrationSummary.lastUpdated 
                      ? new Date(calibrationSummary.lastUpdated).toLocaleString('th-TH')
                      : 'ยังไม่มี'
                    }
                  </span>
                </div>

                {/* Regions needing recalibration */}
                {calibrationSummary.needsRecalibration.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ภูมที่ต้องการปรับปรงง:
                    </h4>
                    <div className="space-y-1">
                      {calibrationSummary.needsRecalibration.map((region: string, idx: number) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        >
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Calibrations Button */}
                <Button 
                  onClick={applyCalibration} 
                  disabled={isLoading}
                  className="w-full"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  นำ Calibrations ที่มี
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีข้อมูล Calibration</p>
                <p className="text-sm">ข้อมูลจะปรากขึ้นเมื่อมีการปรับปรงงแบบจำลอง</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4 mt-4">
            {qaMetrics ? (
              <>
                {/* Data Quality */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    คุณภาพข้อมูล
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">ความสมบูรณ์</div>
                      <div className={`text-2xl font-bold ${getMetricColor(qaMetrics.dataQuality.completeness, 95, 80)}`}>
                        {qaMetrics.dataQuality.completeness.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">ความแม่นยำ</div>
                      <div className={`text-2xl font-bold ${getMetricColor(qaMetrics.dataQuality.accuracy, 90, 75)}`}>
                        {qaMetrics.dataQuality.accuracy.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">ความสอดคล</div>
                      <div className={`text-2xl font-bold ${getMetricColor(qaMetrics.dataQuality.consistency, 90, 80)}`}>
                        {qaMetrics.dataQuality.consistency.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">ความทันสมัย</div>
                      <div className={`text-2xl font-bold ${getMetricColor(qaMetrics.dataQuality.timeliness, 95, 85)}`}>
                        {qaMetrics.dataQuality.timeliness.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Model Performance */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    ประสิทธิ์แบบจำลอง
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">ความแม่นยำการพยากรณ์</div>
                      <div className={`text-2xl font-bold ${getMetricColor(qaMetrics.modelPerformance.predictionAccuracy, 90, 75)}`}>
                        {qaMetrics.modelPerformance.predictionAccuracy.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">การตรวจสอบเหตุการณ์</div>
                      <div className={`text-2xl font-bold ${getMetricColor(qaMetrics.modelPerformance.extremeEventDetection, 85, 70)}`}>
                        {qaMetrics.modelPerformance.extremeEventDetection.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">False Positive Rate</div>
                      <div className={`text-2xl font-bold ${getMetricColor(100 - qaMetrics.modelPerformance.falsePositiveRate, 95, 85)}`}>
                        {qaMetrics.modelPerformance.falsePositiveRate.toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs text-muted-foreground">ระยะเวลาตอบรอบ</div>
                      <div className="text-2xl font-bold">
                        {qaMetrics.modelPerformance.responseTime.toFixed(1)} นาที
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                ยังไม่มีข้อมูล QA Metrics
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-3 mt-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>ระบบ Calibration อยู่ดี</p>
                <p className="text-sm">ไม่มีคำแนะนำที่ต้องดำเนินการ</p>
              </div>
            ) : (
              recommendations.map((rec: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'high' ? 'border-l-red-500 bg-red-50 dark:bg-red-950' :
                    rec.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
                    'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority === 'high' ? 'สูง' : rec.priority === 'medium' ? 'ปานกลาง' : 'ต่ำ'}
                        </Badge>
                        <span className="font-medium">{rec.type}</span>
                      </div>
                      <p className="text-sm">{rec.description}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium mb-1">การดำเนินการ:</div>
                    <p className="text-sm text-muted-foreground">{rec.action}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
