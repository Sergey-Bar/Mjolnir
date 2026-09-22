$prs = @(476,475,474,473,472,471,470,469,468,467,466,465,464,463,462,461,460,459,458,195)
foreach ($p in $prs) {
    try {
        $result = gh pr checks $p --json state,name 2>&1
        $failed = $result | Where-Object { $_.state -eq "FAILURE" }
        if ($failed) {
            Write-Output "PR $p FAILED: $($failed.name -join ', ')"
        } else {
            Write-Output "PR $p: no failures"
        }
    } catch {
        Write-Output "PR $p: Error - $_"
    }
}
