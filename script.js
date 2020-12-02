function main() {

    var SPEND = 0;
    var now = new Date();
    var time_zone = AdsApp.currentAccount().getTimeZone();
    var the_hour = Utilities.formatDate(now, time_zone, "H");
    var the_day = Utilities.formatDate(now, time_zone, "dd");

//STEP 1: Specify the daily/monthly budget you want to limit spend to
    var MAX_TOTALS = 1;

//STEP 2: Specify whether you want to cap daily or monthly spend below - TODAY & THIS_MONTH are the options
    var time_period = "TODAY";

//STEP 2.5 (OPTIONAL): Change the name of the pause label 
    var pause_label = "Daily Budget Script - Paused";

//STEP 3: If you have any campaigns you'd like to keep running regardless of spend levels, give them this label in the Google ads interface
    var exemption_label = "Daily Budget Script - Exemption"; 

    function getCosts(selector) {
      var totals = 0;
      while (selector.hasNext()) {
        var campaign = selector.next();
        var stats = campaign.getStatsFor(time_period)
        totals += stats.getCost();
      }
      return totals;
    }

    function processSpend() {
      SPEND += getCosts(AdsApp.campaigns().get());
      SPEND += getCosts(AdsApp.videoCampaigns().get());
      SPEND += getCosts(AdsApp.shoppingCampaigns().get());
      return SPEND;
    }

    function labelCheck(campaign_to_pause) {
      try {
        campaign_to_pause.applyLabel(pause_label)
      } catch (err) {
        AdsApp.createLabel(pause_label)
        labelCheck(campaign_to_pause)
      }
    }

    function pauseCampaigns(selector) {
      while (selector.hasNext()) {
        var campaign_to_pause = selector.next();
        campaign_to_pause.pause();
        labelCheck(campaign_to_pause)
      }
    }

    function processCampaignPause() {
      if (SPEND > MAX_TOTALS) {
        try {
          var adsSelector = AdsApp.campaigns()
            .withCondition("Status = ENABLED")
            .withCondition("LabelNames CONTAINS_NONE " + "['" + exemption_label + "']")
            .withCondition("CampaignExperimentType = BASE")
            .get();
          var videoSelector = AdsApp.videoCampaigns()
            .withCondition("Status = ENABLED")
            .withCondition("LabelNames CONTAINS_NONE " + "['" + exemption_label + "']")
            .withCondition("CampaignExperimentType = BASE")
            .get();
          var shoppingSelector = AdsApp.shoppingCampaigns()
            .withCondition("Status = ENABLED")
            .withCondition("LabelNames CONTAINS_NONE " + "['" + exemption_label + "']")
            .withCondition("CampaignExperimentType = BASE")
            .get();

          pauseCampaigns(adsSelector);
          pauseCampaigns(videoSelector);
          pauseCampaigns(shoppingSelector);

        } catch (err) {
          AdsApp.createLabel(exemption_label)
          processCampaignPause()
        }
      }
    }
    processSpend();
    processCampaignPause();

    var re_enable_time = time_period === "TODAY" ? the_hour : the_day;
    var re_enable_number = time_period === "TODAY" ? 0 : 1;

    if (Number(re_enable_time) === re_enable_number) {
      function enableCampaigns(selector) {
        while (selector.hasNext()) {
          var campaign = selector.next();
          campaign.enable();
          campaign.removeLabel(pause_label)
        }
      }

      function processCampaignEnable() {
        try {
        var adsSelector = AdsApp.campaigns()
          .withCondition("LabelNames CONTAINS_ANY " + "['" + pause_label + "']")
          .get();
        var videoSelector = AdsApp.videoCampaigns()
          .withCondition("LabelNames CONTAINS_ANY " + "['" + pause_label + "']")
          .get();
        var shoppingSelector = AdsApp.shoppingCampaigns()
          .withCondition("LabelNames CONTAINS_ANY " + "['" + pause_label + "']")
          .get();

        enableCampaigns(adsSelector);
        enableCampaigns(videoSelector);
        enableCampaigns(shoppingSelector);

        } catch (err) {
          AdsApp.createLabel(pause_label)
          processCampaignEnable()
        }
      }
      processCampaignEnable()
    }
  }
