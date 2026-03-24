/**
 * Confidence Bands UI Component
 * Displays confidence intervals on tide graphs
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Shield,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { confidenceBandCalculator, ConfidenceBand } from '@/lib/confidence-bands';
import type { LocationData } from '@/lib/tide-service';

interface ConfidenceBandsPanelProps {
  location: LocationData;
  startTime: Date;
  endTime: Date;
  onConfidenceChange?: (bands: ConfidenceBand[]) => void;
}

export function ConfidenceBandsPanel({
  location,
  startTime,
  endTime,
  onConfidenceChange
}: ConfidenceBandsPanelProps) {
  const [confidenceBands, setConfidenceBands] = useState<ConfidenceBand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);
  const [confidenceLevel, setConfidenceLevel] = useState<'68' | '95'>('95');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate confidence bands when location or time changes
  useEffect(() => {
    const calculateBands = async () => {
      setIsLoading(true);
      try {
        const bands = await confidenceBandCalculator.generateConfidenceBands(
          location,
          startTime,
          endTime,
          15 // 15-minute intervals
        );
        setConfidenceBands(bands);
        
        if (onConfidenceChange) {
          onConfidenceChange(bands);
        }
      } catch (error) {
        console.error('Failed to calculate confidence bands:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (showConfidenceBands) {
      calculateBands();
    } else {
      setConfidenceBands([]);
    }
  }, [location, startTime, endTime, showConfidenceBands]);

  // Get confidence summary statistics
  const getConfidenceSummary = () => {
    if (confidenceBands.length === 0) return null;

    const uncertainties = confidenceBands.map(b => b.uncertainty);
    const avgUncertainty = uncertainties.reduce((sum, u) => sum + u, 0) / uncertainties.length;
    const maxUncertainty = Math.max(...uncertainties);
    const minUncertainty = Math.min(...uncertainties);

    const avgConfidence = confidenceBands.reduce((sum, b) => sum + b.confidence, 0) / confidenceBands.length;

    return {
      average: avgUncertainty,
      maximum: maxUncertainty,
      minimum: minUncertainty,
      confidenceScore: avgConfidence
    };
  };

  const summary = getConfidenceSummary();

  const getUncertaintyColor = (value: number) => {
    if (value < 0.08) return 'text-green-600';
    if (value < 0.12) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLevelColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ช่วงความมั่นใจ
            {isLoading && (
              <span className="ml-2 text-sm text-muted-foreground">
                (กำลังคำนวณ...)
              </span>
            )}
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Toggle confidence bands */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-confidence"
                  checked={showConfidenceBands}
                  onCheckedChange={setShowConfidenceBands}
                />
                <Label htmlFor="show-confidence" className="cursor-pointer">
                  แสดงช่วงความมั่นใจบนกราฟ
                </Label>
              </div>
            </div>
          </div>

          {/* Confidence level selector */}
          <div className="space-y-2">
            <Label>ระดับความมั่นใจ</Label>
            <div className="flex gap-2">
              <Button
                variant={confidenceLevel === '68' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConfidenceLevel('68')}
                className="flex-1"
              >
                68%
              </Button>
              <Button
                variant={confidenceLevel === '95' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConfidenceLevel('95')}
                className="flex-1"
              >
                95%
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {confidenceLevel === '68' 
                ? 'ช่วง 68% (1σ) - ความเป็นไปได้ 68%'
                : 'ช่วง 95% (2σ) - ความเป็นไปได้ 95%'
              }
            </p>
          </div>

          {/* Summary statistics */}
          {summary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {summary.average.toFixed(3)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ความไม่แน่นำ (เฉลี่ยว)
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {summary.minimum.toFixed(3)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    น้อยสุด
                  </div>
                </div>
                
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {summary.maximum.toFixed(3)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    มากสุด
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      คะแนนความมั่นใจโดยรวม
                    </div>
                    <div className="text-3xl font-bold">
                      {summary.confidenceScore.toFixed(0)}
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getConfidenceLevelColor(summary.confidenceScore)}
                  >
                    {summary.confidenceScore >= 90 ? 'ดีเยี่ยม' : 
                     summary.confidenceScore >= 80 ? 'ดี' : 'พอใช้'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Detailed information */}
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full justify-start"
            >
              <Info className="h-4 w-4 mr-2" />
              {showDetails ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
              <TrendingUp className="h-4 w-4 ml-auto" />
            </Button>

            {showDetails && confidenceBands.length > 0 && (
              <div className="space-y-2 p-4 bg-muted rounded-lg max-h-64 overflow-y-auto">
                <h4 className="font-medium mb-3">รายละเอียดความไม่แน่นำตามช่วงเวลา</h4>
                
                {confidenceBands.slice(0, 10).map((band, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {new Date(band.timestamp).toLocaleTimeString('th-TH', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          ระดับน้ำ: {band.height.toFixed(2)} เมตร
                        </span>
                        {confidenceLevel === '95' && (
                          <>
                            <span>|</span>
                            <span className={getUncertaintyColor(band.uncertainty)}>
                              ±{band.uncertainty.toFixed(2)} เมตร
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className={getConfidenceLevelColor(band.confidence)}
                      >
                        {band.confidence.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {confidenceBands.length > 10 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    แสดง 10 รายการแรกจาก {confidenceBands.length} รายการ
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Uncertainty scale */}
          {summary && (
            <div className="space-y-2">
              <Label>สเกลความไม่แน่นำ</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>น้อย</span>
                    <span className="text-green-600">0.08m</span>
                    <span>ปานกลาง</span>
                    <span className="text-yellow-600">0.12m</span>
                    <span>มาก</span>
                    <span className="text-red-600">0.20m</span>
                  </div>
                  <div className="h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-full relative">
                    <div 
                      className="absolute w-3 h-3 bg-white border-2 border-gray-400 rounded-full -top-0.5 shadow-sm cursor-pointer"
                      style={{ 
                        left: `${Math.min(100, (summary.average / 0.20) * 100)}%`,
                        transform: 'translateX(-50%)'
                      }}
                      title={`ค่าเฉลี่ยว: ${summary.average.toFixed(3)}m`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
